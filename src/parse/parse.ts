import type { Expression, Identifier, Method, New } from 'php-parser'
import type {
  ParseResult,
  ParsedFunctions,
  ParsedVariable,
} from '~/utils/moodle-types'

import fs from 'fs'
import path from 'path'

import { Engine } from 'php-parser'

import {
  NullAllowedType,
  PrimitiveVariableType,
  RequiredType,
  VariableType,
} from '~/utils/moodle-source-schemas'
import {
  UnknownType,
  isType,
  typeChecked,
  typeRelaxChecked,
} from '~/utils/moodle-types'

// Files excluded because it is hard to parse automatically, these 'may' be parsed manually
// reason for each file is written in the comment next to path
const ERROR_FILES = [
  'moodle/moodle-master/report/competency/classes/external.php', // Variable instead of `new` constructor
  'moodle/moodle-master/admin/tool/lp/classes/external.php', // Variable instead of `new` constructor
  'moodle/moodle-master/mod/glossary/classes/external.php', // Use of `helper_for_get_mods_by_courses::standard_coursemodule_elements_returns`
  'moodle/moodle-master/auth/email/classes/external.php', // Use of `core_user::get_property_type`
  'moodle/moodle-master/competency/classes/external.php', // Variable instead of `new` constructor
  'moodle/moodle-master/mod/assign/externallib.php', // Variable instead of `new` constructor
  'moodle/moodle-master/auth/classes/external.php', // Use of `core_user::get_property_type`
  'moodle/moodle-master/cohort/externallib.php', // Use of `self::build_custom_fields_parameters_structure`
  'moodle/moodle-master/group/externallib.php', // Use of `self::build_custom_fields_parameters_structure`
  'moodle/moodle-master/user/externallib.php', // Variable instead of `new` constructor
]

const getAbsPath = (relativePath: string): string =>
  path.join(__dirname, '..', relativePath)

export const parseMoodleSourceCode = () => {
  const parser: Engine = new Engine({
    parser: {
      extractDoc: true,
      php7: true,
    },
    ast: {
      withSource: true,
    },
  })

  const lines = fs
    .readFileSync(getAbsPath('data/files.txt'), 'utf-8')
    .split('\n')
    .filter(Boolean)
  const types = new Map<
    string[],
    Record<string, { params?: ParsedVariable; returnType?: ParsedVariable }>
  >()

  for (const line of lines) {
    try {
      const { package: packagePath, functions } = parseContent(
        parser,
        fs.readFileSync(getAbsPath(`../${line}`), 'utf-8'),
        line,
      )
      if (types.has(packagePath)) {
        types.set(packagePath, {
          ...types.get(packagePath)!,
          ...functions,
        })
      } else {
        types.set(packagePath, functions)
      }
    } catch (e) {
      if (ERROR_FILES.includes(line)) {
        continue
      }

      if (e instanceof Error) {
        if (e.message.includes('No class found')) {
          continue
        }
      }

      throw e
    }
  }

  const typesArray: ParseResult[] = []
  for (const [packagePath, functions] of types.entries()) {
    typesArray.push({
      package: packagePath,
      functions,
    })
  }

  fs.writeFileSync(
    getAbsPath('data/types.json'),
    JSON.stringify(typesArray, null, 2),
  )
}

const parseContent = (
  parser: Engine,
  content: string,
  filename?: string,
): ParseResult => {
  const program = parser.parseCode(content, filename ?? '')

  const namespaceNode = program.children.find(isType('namespace'))

  const namespaceName = namespaceNode?.name
  const packageNameInComment = program.comments
    ?.filter(isType('commentblock'))
    ?.find((node) => node.value.includes('@package'))
    ?.value.match(/@package\s+(.*)/)?.[1]

  const packageName = namespaceName ?? packageNameInComment

  if (!packageName) {
    throw new Error(`${filename} - No package found`)
  }

  const classNode = [
    ...(namespaceNode?.children ?? []),
    ...program.children,
  ].find(isType('class'))
  if (!classNode) {
    throw new Error(`${filename} - No class found`)
  }

  const methods = classNode.body.filter(isType('method'))

  const functions = methods.reduce((acc, method) => {
    const name = getMethodName(method)

    if (name.endsWith('_parameters')) {
      const functionName = name.replace(/_parameters$/g, '')

      try {
        return {
          ...acc,
          [functionName]: {
            ...acc[functionName],
            params: parseParams(method),
          },
        }
      } catch (e) {
        // throw new Error(`${filename} - Cannot parse params`, {
        //   cause: e,
        // })
        return {
          ...acc,
          [functionName]: {
            ...acc[functionName],
            params: UnknownType,
          },
        }
      }
    }

    if (name.endsWith('_returns')) {
      const functionName = name.replace(/_returns$/g, '')

      try {
        return {
          ...acc,
          [functionName]: {
            ...acc[functionName],
            returnType: parseReturnType(method),
          },
        }
      } catch (e) {
        // throw new Error(`${filename} - Cannot parse return`, {
        //   cause: e,
        // })
        return {
          ...acc,
          [functionName]: {
            ...acc[functionName],
            returnType: UnknownType,
          },
        }
      }
    }

    return {
      ...acc,
      [name]: {
        ...acc[name],
        // Remove comment block lines that contains "@param", "@return"
        description: typeChecked(method.leadingComments?.[0], 'commentblock')
          .value.replace(/\* @param.*\n/g, '')
          .replace(/\* @return.*\n/g, ''),
      },
    }
  }, {} as ParsedFunctions)

  return {
    package: packageName.split(/[_.\\]/g),
    functions,
  }
}

const getMethodName = (method: Method): string =>
  (method.name as Identifier).name || (method.name as string)

const parseParams = (method: Method): ParsedVariable => {
  return parseExternalType(
    typeChecked(method.body?.children.find(isType('return'))?.expr, 'new'),
  )
}

const parseReturnType = (method: Method): ParsedVariable => {
  return parseExternalType(
    typeChecked(method.body?.children.find(isType('return'))?.expr, 'new'),
  )
}

const parseExternalType = (node: New): ParsedVariable => {
  const nodeName = typeChecked(node.what, 'name').name
  if (nodeName.endsWith('external_value')) {
    // Normal named value

    // $type,
    // $desc = '',
    // $required = VALUE_REQUIRED,
    // $default = null,
    // $allownull = NULL_ALLOWED
    return {
      type: PrimitiveVariableType.parse(
        typeChecked(node.arguments[0], 'name').name,
      ),
      description: typeRelaxChecked(node.arguments[1], 'string')?.value,
      required: RequiredType.parse(
        typeRelaxChecked(node.arguments[2], 'name')?.name ??
          RequiredType.Values.VALUE_REQUIRED,
      ),
      defaultValue: node.arguments[3]?.loc?.source ?? undefined,
      allownull: NullAllowedType.parse(
        typeRelaxChecked(node.arguments[4], 'name')?.name ??
          NullAllowedType.Values.NULL_ALLOWED,
      ),
    }
  }

  if (nodeName.endsWith('external_warnings')) {
    // Moodle warning

    // $itemdesc = 'item',
    // $itemiddesc = 'item id',
    // $warningcodedesc = 'the warning code can be used by the client app to implement specific behaviour'
    return {
      type: VariableType.Values.ARRAY,
      description: 'list of warnings',
      required: RequiredType.Values.VALUE_OPTIONAL,
      allownull: NullAllowedType.Values.NULL_ALLOWED,
      element: {
        type: VariableType.Values.OBJECT,
        description: 'warning',
        required: RequiredType.Values.VALUE_REQUIRED,
        allownull: NullAllowedType.Values.NULL_NOT_ALLOWED,
        attributes: {
          item: {
            type: VariableType.Values.PARAM_TEXT,
            description: typeRelaxChecked(node.arguments[0], 'string')?.value,
            required: RequiredType.Values.VALUE_OPTIONAL,
            allownull: NullAllowedType.Values.NULL_ALLOWED,
          },
          itemid: {
            type: VariableType.Values.PARAM_INT,
            description: typeRelaxChecked(node.arguments[1], 'string')?.value,
            required: RequiredType.Values.VALUE_OPTIONAL,
            allownull: NullAllowedType.Values.NULL_ALLOWED,
          },
          warningcode: {
            type: VariableType.Values.PARAM_ALPHANUM,
            description: typeRelaxChecked(node.arguments[2], 'string')?.value,
            required: RequiredType.Values.VALUE_REQUIRED,
            allownull: NullAllowedType.Values.NULL_ALLOWED,
          },
          message: {
            type: VariableType.Values.PARAM_RAW,
            description: 'untranslated english message to explain the warning',
            required: RequiredType.Values.VALUE_REQUIRED,
            allownull: NullAllowedType.Values.NULL_ALLOWED,
          },
        },
      },
    }
  }

  if (nodeName.endsWith('external_function_parameters')) {
    // Function parameters

    // array $keys,
    // $desc = '',
    // $required = VALUE_REQUIRED,
    // $default = null
    return {
      type: VariableType.Values.OBJECT,
      description: typeRelaxChecked(node.arguments[1], 'string')?.value,
      required: RequiredType.parse(
        typeRelaxChecked(node.arguments[2], 'name')?.name ??
          RequiredType.Values.VALUE_REQUIRED,
      ),
      defaultValue: node.arguments[3]?.loc?.source ?? undefined,
      allownull: NullAllowedType.Values.NULL_NOT_ALLOWED,
      attributes: parseExternalTypeAttributes(
        typeChecked(node.arguments[0], 'array').items,
      ),
    }
  }

  if (nodeName.endsWith('external_single_structure')) {
    // Object

    // array $keys,
    // $desc = '',
    // $required = VALUE_REQUIRED,
    // $default = null,
    // $allownull = NULL_NOT_ALLOWED
    return {
      type: VariableType.Values.OBJECT,
      description: typeRelaxChecked(node.arguments[1], 'string')?.value,
      required: RequiredType.parse(
        typeRelaxChecked(node.arguments[2], 'name')?.name ??
          RequiredType.Values.VALUE_REQUIRED,
      ),
      defaultValue: node.arguments[3]?.loc?.source ?? undefined,
      allownull: NullAllowedType.parse(
        typeRelaxChecked(node.arguments[4], 'name')?.name ??
          NullAllowedType.Values.NULL_NOT_ALLOWED,
      ),
      attributes: parseExternalTypeAttributes(
        typeChecked(node.arguments[0], 'array').items,
      ),
    }
  }

  if (nodeName.endsWith('external_multiple_structure')) {
    // Array
    return {
      type: VariableType.Values.ARRAY,
      description: typeRelaxChecked(node.arguments[1], 'string')?.value,
      required: RequiredType.parse(
        typeRelaxChecked(node.arguments[2], 'name')?.name ??
          RequiredType.Values.VALUE_REQUIRED,
      ),
      defaultValue: node.arguments[3]?.loc?.source ?? undefined,
      allownull: NullAllowedType.parse(
        typeRelaxChecked(node.arguments[4], 'name')?.name ??
          NullAllowedType.Values.NULL_NOT_ALLOWED,
      ),
      element: parseExternalType(typeChecked(node.arguments[0], 'new')),
    }
  }

  throw new Error(`Cannot parse external type - ${nodeName} not supported`)
}

const parseExternalTypeAttributes = (
  attributes: Expression[],
): Record<string, ParsedVariable> =>
  attributes.reduce((acc, argument) => {
    if (!isType('entry')(argument)) {
      return acc
    }

    const { key } = argument
    if (!key) {
      throw new Error(`Cannot parse entry - key or value missing`)
    }
    const value = typeChecked(argument.value, 'new')

    if (typeChecked(value.what, 'name').name === 'external_format_value') {
      const referencedAttribute = typeChecked(
        value.arguments[0],
        'string',
      ).value

      // $textfieldname,
      // $required = VALUE_REQUIRED,
      // $default = null

      return {
        ...acc,
        [getStringNodeValue(key)!]: {
          type: 'PARAM_INT',
          //   $desc = sprintf(
          //     "%s format (%s = HTML, %s = MOODLE, %s = PLAIN, or %s = MARKDOWN",
          //     $textfieldname,
          //     FORMAT_HTML = 1,
          //     FORMAT_MOODLE = 0,
          //     FORMAT_PLAIN = 2,
          //     FORMAT_MARKDOWN = 4,
          // );
          description: `${referencedAttribute} format (1 = HTML, 0 = MOODLE, 2 = PLAIN, or 4 = MARKDOWN)`,
          required: RequiredType.parse(
            typeRelaxChecked(value.arguments[1], 'name')?.name ??
              RequiredType.Values.VALUE_REQUIRED,
          ),
          defaultValue: value.arguments[2]?.loc?.source ?? undefined,
          allownull: NullAllowedType.Values.NULL_ALLOWED,
        },
      }
    }

    return {
      ...acc,
      [getStringNodeValue(key)!]: parseExternalType(value),
    }
  }, {})

const getStringNodeValue = (node?: Expression): string | undefined => {
  return typeRelaxChecked(node, 'string')?.value
}

parseMoodleSourceCode()
