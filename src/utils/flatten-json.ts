import { serialize } from 'object-to-formdata'

export const serializeForm = (data: unknown) => {
  // eslint-disable-next-line ts/no-unsafe-assignment, ts/no-unsafe-member-access, ts/no-unsafe-call
  const formData = Object.fromEntries([
    ...serialize(data, {
      indices: true,
      booleansAsIntegers: true,
    }).entries(),
  ])

  return formData
}
