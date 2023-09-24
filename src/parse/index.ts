import { exec } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import assocPath from 'ramda/src/assocPath'

import { camelCase } from '../utils/string'

const NAMESPACE_NAME = 'MoodleClientFunctionTypes'

function getAbsPath(relativePath: string): string {
  return path.join(__dirname, '..', relativePath)
}

interface MoodleTypingAnnotation {
  [key: string]: string | MoodleTypingAnnotation
}

void (async () => {
  const functions = (await fs.readFile(getAbsPath('data/ws-functions.txt')))
    .toString()
    .split('\n')
    .filter(Boolean)

  const typeNames = await fs
    .readFile(getAbsPath('data/ws-function-types.d.ts'))
    .then(content => content
      .toString()
      .split('\n')
      .map(line => line.match(/export type (\S+) =/)?.[1] ?? '')
      .filter(Boolean))

  let resultObject: MoodleTypingAnnotation = {}

  for (const funcName of functions) {
    const paramsName = typeNames.find(
      typeName => typeName.toLowerCase() === `${funcName.replaceAll('_', '')}wsparams`,
    )
    const returnName = typeNames.find(
      typeName => typeName.toLowerCase() === `${funcName.replaceAll('_', '')}wsresponse`,
    )

    // eslint-disable-next-line ts/no-unused-vars
    const [_, namespace, fName] = funcName.match(/^([^_]+_[^_]+)_(\S+)/) ?? []

    if (!paramsName || !returnName || !namespace || !fName)
      throw new Error(`Invalid function name: ${funcName}`)

    resultObject = assocPath(
      [...namespace.split('_'), camelCase(fName)],
      `(params: ${NAMESPACE_NAME}.${paramsName}) => Promise<${NAMESPACE_NAME}.${returnName}>`,
    )(resultObject) as MoodleTypingAnnotation
  }

  await fs
    .writeFile(
      getAbsPath('data/index.ts'),
      `/* eslint-disable */
      import type * as ${NAMESPACE_NAME} from './ws-function-types.d.ts'
      export type * as ${NAMESPACE_NAME} from './ws-function-types.d.ts'

      export type MoodleClientTypes = ${JSON.stringify(resultObject).replaceAll(
        '"',
        '',
      )}`,
    )
    .then(() =>
      exec('bun run prettier -- --write index.d.ts', {
        cwd: getAbsPath('data'),
      }))
})()
