import { serialize } from 'object-to-formdata'

export const serializeForm = (data: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const formData = Object.fromEntries([
    ...serialize(data, {
      indices: true,
    }).entries(),
  ])

  return formData
}
