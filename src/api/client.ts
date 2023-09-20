/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { MoodleClientTypes } from '~/data/types'

import has from 'ramda/src/has'
import axios from 'axios'

import { snakeCase } from '~/utils/string'

type MoodleFunction = (arg: object) => Promise<unknown>

const _initializeClient = (baseUrl: string, token: string) => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const client = () => {}

  const request = <F extends MoodleFunction>(
    functionName: string,
    params: Parameters<F>[0],
  ): ReturnType<F> =>
    axios
      .post(
        `${baseUrl}/webservice/rest/server.php`,
        {
          wstoken: token,
          wsfunction: functionName,
          moodlewsrestformat: 'json',
          ...params,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      )
      .then((res) => res.data as unknown) as ReturnType<F>

  client.request = request
  return client as typeof client & MoodleClientTypes
}

type MoodleClient = ReturnType<typeof _initializeClient>

const callMoodleApi = <F extends MoodleFunction>(
  client: MoodleClient,
  funcPath: string[],
  params: object,
) => {
  const path = snakeCase(funcPath.join('_'))
  return client.request<F>(path, params)
}

const createClientProxy = <T extends MoodleClient>(
  client: T,
  path: string[] = [],
): T => {
  return new Proxy(client, {
    get(target, prop) {
      console.log('get', path, prop, has(prop, client))
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
      console.log('apply', path, argArray)
      // If the function is called, we call the Moodle API
      return callMoodleApi(client, path, argArray)
    },
  })
}

export const initializeClient = (baseUrl: string, token: string) => {
  return createClientProxy(_initializeClient(baseUrl, token))
}
