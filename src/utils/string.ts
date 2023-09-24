export function camelCase(str: string) {
  return str.replace(/_([a-z])/g, g => g[1]!.toUpperCase())
}

export function snakeCase(str: string) {
  return str
    .replace(/^(.)/g, match => match.toLowerCase())
    .replace(/[A-Z]/g, g => `_${g.toLowerCase()}`)
}
