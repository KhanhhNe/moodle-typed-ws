/* eslint-disable ts/no-unsafe-argument */
import has from 'ramda/src/has'
import type { MoodleClientTypes } from '../data/ws-function-types'
import { serializeForm } from '../utils/flatten-json'
import { snakeCase } from '../utils/string'

type MoodleFunction = (arg: object) => Promise<unknown>

function _initializeClient(baseUrl: string, token: string) {
  // eslint-disable-next-line ts/no-empty-function
  const client = () => {}

  const utils = {
    request: <F extends MoodleFunction>(
      functionName: string,
      params: Parameters<F>[0],
    ): ReturnType<F> =>
      fetch(`${baseUrl}/webservice/rest/server.php`, {
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
        .then((res) => res.json())
        .then((res) => res as unknown) as ReturnType<F>,
  }

  client.utils = utils
  return client as unknown as {
    utils: typeof utils
  } & MoodleClientTypes
}

type MoodleClient = ReturnType<typeof _initializeClient>

function callMoodleApi<F extends MoodleFunction>(
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
}

export const initializeClient = ({ baseUrl, token }: MoodleClientOptions) =>
  createClientProxy(_initializeClient(baseUrl, token))
