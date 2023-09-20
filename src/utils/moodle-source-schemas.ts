import { z } from 'zod'

export const VariableType = z.enum([
  'UNKNOWN',
  'OBJECT',
  'ARRAY',
  'PARAM_ALPHA',
  'PARAM_ALPHAEXT',
  'PARAM_ALPHANUM',
  'PARAM_ALPHANUMEXT',
  'PARAM_AUTH',
  'PARAM_BASE64',
  'PARAM_BOOL',
  'PARAM_CAPABILITY',
  'PARAM_CLEANHTML',
  'PARAM_EMAIL',
  'PARAM_FILE',
  'PARAM_FLOAT',
  'PARAM_LOCALISEDFLOAT',
  'PARAM_HOST',
  'PARAM_INT',
  'PARAM_LANG',
  'PARAM_LOCALURL',
  'PARAM_NOTAGS',
  'PARAM_PATH',
  'PARAM_PEM',
  'PARAM_PERMISSION',
  'PARAM_RAW',
  'PARAM_RAW_TRIMMED',
  'PARAM_SAFEDIR',
  'PARAM_SAFEPATH',
  'PARAM_SEQUENCE',
  'PARAM_TAG',
  'PARAM_TAGLIST',
  'PARAM_TEXT',
  'PARAM_THEME',
  'PARAM_URL',
  'PARAM_USERNAME',
  'PARAM_STRINGID',
  'PARAM_CLEAN',
  'PARAM_INTEGER',
  'PARAM_NUMBER',
  'PARAM_ACTION',
  'PARAM_FORMAT',
  'PARAM_MULTILANG',
  'PARAM_TIMEZONE',
  'PARAM_CLEANFILE',
  'PARAM_COMPONENT',
  'PARAM_AREA',
  'PARAM_PLUGIN',
])
export type VariableType = z.infer<typeof VariableType>
export const PrimitiveVariableType = VariableType.exclude(['ARRAY', 'OBJECT'])
export type PrimitiveVariableType = z.infer<typeof PrimitiveVariableType>

export const RequiredType = z.enum([
  'VALUE_OPTIONAL',
  'VALUE_REQUIRED',
  'VALUE_DEFAULT',
])
export type RequiredType = z.infer<typeof RequiredType>

export const NullAllowedType = z.enum(['NULL_NOT_ALLOWED', 'NULL_ALLOWED'])
export type NullAllowedType = z.infer<typeof NullAllowedType>
