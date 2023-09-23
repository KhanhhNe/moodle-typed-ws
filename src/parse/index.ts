import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'

import assocPath from 'ramda/src/assocPath'

import { camelCase } from '../utils/string'

const NAMESPACE_NAME = 'MoodleClientFunctionTypes'

const getAbsPath = (relativePath: string): string =>
  path.join(__dirname, '..', relativePath)

type MoodleTypingAnnotation = {
  [key: string]: string | MoodleTypingAnnotation
}

void (async () => {
  const functions = (await fs.readFile(getAbsPath('data/ws-functions.txt')))
    .toString()
    .split('\n')
    .filter(Boolean)

  const typeNames = await fs
    .readFile(getAbsPath('data/ws-function-types.d.ts'))
    .then((content) =>
      content
        .toString()
        .split('\n')
        .map((line) => line.match(/export type (\S+) =/)?.[1] ?? '')
        .filter(Boolean),
    )

  let resultObject: MoodleTypingAnnotation = {}

  for (const funcName of functions) {
    const paramsName = typeNames.find(
      (typeName) =>
        typeName.toLowerCase() === `${funcName.replaceAll('_', '')}wsparams`,
    )
    const returnName = typeNames.find(
      (typeName) =>
        typeName.toLowerCase() === `${funcName.replaceAll('_', '')}wsresponse`,
    )

    const [_, namespace, fName] = funcName.match(/^([^_]+_[^_]+)_(\S+)/) ?? []

    if (!paramsName || !returnName || !namespace || !fName) {
      throw new Error(`Invalid function name: ${funcName}`)
    }

    resultObject = assocPath(
      [...namespace.split('_'), camelCase(fName)],
      `(params: ${NAMESPACE_NAME}.${paramsName}) => Promise<${NAMESPACE_NAME}.${returnName}>`,
    )(resultObject) as MoodleTypingAnnotation
  }

  await fs
    .writeFile(
      getAbsPath('data/index.d.ts'),
      `/* eslint-disable */
      import type * as _WSFuncTypes from './ws-function-types.d.ts'

      export type ${NAMESPACE_NAME} = _WSFuncTypes

      export type MoodleClientTypes = ${JSON.stringify(resultObject).replaceAll(
        '"',
        '',
      )}`,
    )
    .then(() =>
      exec('bun run prettier -- --write index.d.ts', {
        cwd: getAbsPath('data'),
      }),
    )
})()
