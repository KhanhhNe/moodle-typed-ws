export const camelCase = (str: string) =>
  str.replace(/_([a-z])/g, (g) => g[1]!.toUpperCase())

export const snakeCase = (str: string) =>
  str
    .replace(/^(.)/g, (match) => match.toLowerCase())
    .replace(/[A-Z]/g, (g) => `_${g.toLowerCase()}`)
