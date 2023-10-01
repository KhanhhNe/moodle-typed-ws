import type {
  Array as ASTArray,
  Class,
  CommentBlock,
  Entry,
  Identifier,
  Method,
  Name,
  Namespace,
  New,
  Return,
  String as ASTString,
  Variable,
} from 'php-parser'
import path from 'ramda/src/path'
import {
  type NullAllowedType,
  NullAllowedTypeSchema,
  type RequiredType,
  RequiredTypeSchema,
  type VariableType,
  VariableTypeSchema,
} from './moodle-source-schemas'

interface BaseVariable {
  type: VariableType
  description?: string
  defaultValue?: string
  required: RequiredType
  allownull: NullAllowedType
}

interface ObjectParsedVariable extends BaseVariable {
  type: 'OBJECT'
  attributes: Record<string, ParsedVariable>
}

interface ArrayParsedVariable extends BaseVariable {
  type: 'ARRAY'
  element: ParsedVariable
}

interface PrimitiveParsedVariable extends BaseVariable {
  type: Exclude<VariableType, 'OBJECT' | 'ARRAY'>
}

export type ParsedVariable =
  | ObjectParsedVariable
  | ArrayParsedVariable
  | PrimitiveParsedVariable

export const UnknownType: ParsedVariable = {
  type: VariableTypeSchema.Values.UNKNOWN,
  required: RequiredTypeSchema.Values.VALUE_OPTIONAL,
  allownull: NullAllowedTypeSchema.Values.NULL_ALLOWED,
}

export type ParsedFunctions = Record<
  string,
  {
    params?: ParsedVariable
    returnType?: ParsedVariable
    description?: string
  }
>

export interface ParseResult {
  package: string[]
  functions: ParsedFunctions
}

const TypeMapObject = {
  class: undefined as Class | undefined,
  entry: undefined as Entry | undefined,
  identifier: undefined as Identifier | undefined,
  string: undefined as ASTString | undefined,
  method: undefined as Method | undefined,
  namespace: undefined as Namespace | undefined,
  new: undefined as New | undefined,
  return: undefined as Return | undefined,
  variable: undefined as Variable | undefined,
  commentblock: undefined as CommentBlock | undefined,
  array: undefined as ASTArray | undefined,
  name: undefined as Name | undefined,
}
type RemoveValueUndefined<T> = {
  [K in keyof T]: NonNullable<T[K]>
}
type TypeMap = RemoveValueUndefined<typeof TypeMapObject>

export const typeRelaxChecked = <T extends keyof TypeMap>(
  node: unknown,
  type: T,
): TypeMap[T] | undefined => {
  if (path(['kind'], node) === type) return node as unknown as TypeMap[T]

  return undefined
}
export const typeChecked = <T extends keyof TypeMap>(
  node: unknown,
  type: T,
): TypeMap[T] => {
  if (typeRelaxChecked(node, type)) return node as unknown as TypeMap[T]

  throw new Error(
    `Type check failed - ${type} expected but ${path(['kind'], node)} found`,
  )
}
export const isType =
  <T extends keyof TypeMap>(type: T) =>
  (node: unknown): node is TypeMap[T] =>
    path(['kind'], node) === type
