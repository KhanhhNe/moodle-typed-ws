import { serialize } from 'object-to-formdata'

export const serializeForm = (data: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const formData = [
    ...serialize(data, {
      indices: true,
    }).entries(),
  ]
    .map(
      ([key, value]) =>
        `${key}=${encodeURIComponent(
          (value as string | number | boolean | null | undefined) ?? '',
        )}`,
    )
    .join('&')

  return formData
}
