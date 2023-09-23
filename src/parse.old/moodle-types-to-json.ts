import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'

import { compile } from 'json-schema-to-typescript'
import assocPath from 'ramda/src/assocPath'

import { RequiredType, VariableType } from '../utils/moodle-source-schemas'
import { type ParseResult, type ParsedVariable } from '../utils/moodle-types'
import { camelCase } from '../utils/string'

type MoodleTypingAnnotation = {
  [key: string]: string | MoodleTypingAnnotation
}

const getAbsPath = (relativePath: string): string =>
  path.join(__dirname, '..', relativePath)

export const moodleTypesToJson = async () => {
  await fs.mkdir(getAbsPath('data/types'), { recursive: true })
  const moodleTypes = JSON.parse(
    (await fs.readFile(getAbsPath('data/types.json'))).toString(),
  ) as ParseResult[]

  const moodlePackages = moodleTypes
  let resultObject: MoodleTypingAnnotation = {}
  const imports: string[] = []
  const exports: string[] = []
  const namespaceName = 'MoodleClientFunctionTypes'

  for (const moodlePackage of moodlePackages) {
    for (const [name, func] of Object.entries(moodlePackage.functions)) {
      const funcName = camelCase(name)
      const funcCamelCase = camelCase(
        `_${moodlePackage.package.join('_')}_${name}`,
      )
      let paramsType = 'AnyType'
      let returnType = 'AnyType'

      if (func.params) {
        paramsType = `${funcCamelCase}ParamsType`
        imports.push(
          `import type { ${paramsType} as _${paramsType} } from './${paramsType}'`,
        )
        exports.push(paramsType)

        void compileType(func.params, paramsType)
      }

      if (func.returnType) {
        returnType = `${funcCamelCase}ReturnType`
        imports.push(
          `import type { ${returnType} as _${returnType} } from './${returnType}'`,
        )
        exports.push(returnType)

        void compileType(func.returnType, returnType)
      }

      resultObject = assocPath(
        [...moodlePackage.package, funcName],
        `(params: ${namespaceName}.${paramsType}) => Promise<${namespaceName}.${returnType}>`,
      )(resultObject) as MoodleTypingAnnotation
    }
  }

  await fs
    .writeFile(
      getAbsPath('data/types/index.d.ts'),
      '/* eslint-disable */\n' +
        imports.join('\n') +
        '\n' +
        'export type MoodleClientTypes = ' +
        JSON.stringify(resultObject).replaceAll('"', '') +
        '\n' +
        `export namespace MoodleClientFunctionTypes {${
          exports.map((e) => `export type ${e} = _${e}`).join('\n') +
          '\n' +
          'export type AnyType = any'
        }}`,
    )
    .then(() =>
      exec('bun run prettier -- --write index.d.ts', {
        cwd: getAbsPath('data/types'),
      }),
    )
}

const compileType = async (typeVar: ParsedVariable, name: string) => {
  await compile(parseType(typeVar), name, {
    additionalProperties: false,
    bannerComment: '',
  }).then((result) =>
    fs.writeFile(getAbsPath(`data/types/${name}.d.ts`), result),
  )
}

type BaseJSONSchemaType = {
  description?: string
  required?: string[]
  tsType?: string
}

type SimplePrimitiveJSONSchemaType = BaseJSONSchemaType & {
  type: 'string' | 'number' | 'boolean' | 'null' | 'array'
  items?: SimplePrimitiveJSONSchemaType
}

type JSONSchemaType =
  | SimplePrimitiveJSONSchemaType
  | (BaseJSONSchemaType & {
      type: ['string', 'null'] | ['number', 'null'] | ['boolean', 'null']
    })
  | (BaseJSONSchemaType & {
      type: 'array'
      items: JSONSchemaType
    })
  | (BaseJSONSchemaType & {
      type: 'object'
      properties: Record<string, JSONSchemaType>
    })

const parseType = (variable: ParsedVariable): JSONSchemaType => {
  if (variable.type === VariableType.Values.OBJECT) {
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(variable.attributes).map(([name, attribute]) => [
          name,
          parseType(attribute),
        ]),
      ),
      required: Object.entries(variable.attributes)
        .filter(
          ([, attribute]) =>
            attribute.required === RequiredType.Values.VALUE_REQUIRED,
        )
        .map(([name]) => name),
    }
  } else if (variable.type === VariableType.Values.ARRAY) {
    return { type: 'array', items: parseType(variable.element) }
  } else {
    const result = parsePrimitiveType(variable)
    if (
      result.type !== 'array' &&
      result.type !== 'null' &&
      variable.allownull === 'NULL_ALLOWED'
    ) {
      return {
        type: [result.type, 'null'],
        description: variable.description,
      }
    } else {
      return {
        type: result.type,
        items: result.items,
        description: variable.description,
      }
    }
  }
}

const parsePrimitiveType = (
  variable: ParsedVariable,
): SimplePrimitiveJSONSchemaType => {
  if (
    (
      [
        'PARAM_ALPHA',
        'PARAM_ALPHAEXT',
        'PARAM_ALPHANUM',
        'PARAM_ALPHANUMEXT',
        'PARAM_AUTH',
        'PARAM_BASE64',
        'PARAM_CAPABILITY',
        'PARAM_CLEANHTML',
        'PARAM_EMAIL',
        'PARAM_FILE',
        'PARAM_HOST',
        'PARAM_LANG',
        'PARAM_LANG',
        'PARAM_LOCALURL',
        'PARAM_NOTAGS',
        'PARAM_PATH',
        'PARAM_PEM',
        'PARAM_PERMISSION',
        'PARAM_RAW',
        'PARAM_RAW_TRIMMED',
        'PARAM_SAFEDIR',
        'PARAM_SAFEPATH',
        'PARAM_TAG',
        'PARAM_TAGLIST',
        'PARAM_TEXT',
        'PARAM_THEME',
        'PARAM_URL',
        'PARAM_USERNAME',
        'PARAM_STRINGID',
        'PARAM_CLEAN',
        'PARAM_ACTION',
        'PARAM_FORMAT',
        'PARAM_MULTILANG',
        'PARAM_TIMEZONE',
        'PARAM_CLEANFILE',
        'PARAM_COMPONENT',
        'PARAM_AREA',
        'PARAM_PLUGIN',
      ] as VariableType[]
    ).includes(variable.type)
  ) {
    return { type: 'string' }
  }

  if ((['PARAM_BOOL'] as VariableType[]).includes(variable.type)) {
    return { type: 'boolean' }
  }

  if (
    (
      [
        'PARAM_FLOAT',
        'PARAM_LOCALISEDFLOAT',
        'PARAM_INT',
        'PARAM_INTEGER',
        'PARAM_NUMBER',
      ] as VariableType[]
    ).includes(variable.type)
  ) {
    return { type: 'number' }
  }

  if ((['PARAM_SEQUENCE'] as VariableType[]).includes(variable.type)) {
    return { type: 'array', items: { type: 'number' } }
  }

  if (variable.type === 'UNKNOWN') {
    return {
      type: 'string',
      tsType: 'any',
    }
  }

  throw new Error(`Unknown primitive type: ${variable.type}`)
}
