import { inspect } from 'node:util'
import has from 'ramda/src/has'
import type { MoodleClientTypes } from '../data/ws-function-types'
import { serializeForm } from '../utils/flatten-json'
import { snakeCase } from '../utils/string'

type MoodleFunction = (arg: object) => Promise<unknown>

function _initializeClient({
  baseUrl,
  token,
  debug,
}: {
  baseUrl: string
  token: string
  debug: boolean
}) {
  // eslint-disable-next-line ts/no-empty-function
  const client = () => {}

  const utils = {
    request: async <F extends MoodleFunction>(
      functionName: string,
      params: Parameters<F>[0],
    ) => {
      const startTime = Date.now()
      if (debug) {
        console.log(
          `==> ${functionName}: ${inspect(params, {
            depth: 10,
            colors: true,
          })}`,
        )
      }

      return (await fetch(`${baseUrl}/webservice/rest/server.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          wstoken: token,
          wsfunction: functionName,
          moodlewsrestformat: 'json',
          ...serializeForm(params),
        }),
      })
        .then(async (res) => {
          const totalTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2)

          if (res.status >= 400) {
            const errorMsg = `<== ${functionName} (${totalTimeSeconds}s) [ERROR] - ${res.status} (${res.statusText})`
            console.error(errorMsg)
            console.error(await res.text())

            throw new Error(errorMsg)
          }

          const data = await res.json()
          if (debug) {
            console.log(
              `<== ${functionName} (${totalTimeSeconds}s): ${inspect(data, {
                depth: 10,
                colors: true,
              })}`,
            )
          }

          return data
        })
        .then((res) => res as unknown)) as ReturnType<F>
    },
  }

  client.utils = utils
  return client as unknown as {
    utils: typeof utils
  } & MoodleClientTypes
}

type MoodleClient = ReturnType<typeof _initializeClient>

export function callMoodleApi<F extends MoodleFunction>(
  client: MoodleClient,
  funcPath: string[],
  params: object,
) {
  const path = snakeCase(funcPath.join('_'))
  return client.utils.request<F>(path, params)
}

function createClientProxy<T extends MoodleClient>(
  client: T,
  path: string[] = [],
): T {
  return new Proxy(client, {
    get(target, prop) {
      if (has(prop, client)) {
        // Return object property if it exists
        return client[prop as keyof T]
      } else {
        // Otherwise, return a proxy for the next level.
        // The object will still be empty, but since we apply deep typing
        // to the object, the proxy will be able to return the correct type.
        return createClientProxy(client, [
          ...path,
          prop as string,
        ]) as T[keyof T] //
      }
    },
    apply(target, thisArg, argArray) {
      // If the function is called, we call the Moodle API
      return callMoodleApi(client, path, argArray[0])
    },
  })
}

export interface MoodleClientOptions {
  baseUrl: string
  token: string
  debug?: boolean
}

export const initializeClient = ({
  baseUrl,
  token,
  debug = false,
}: MoodleClientOptions) =>
  createClientProxy(_initializeClient({ baseUrl, token, debug }))
