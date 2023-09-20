import type {
  Class,
  Entry,
  Identifier,
  Method,
  Namespace,
  New,
  Return,
  Variable,
  CommentBlock,
  Array,
  Name,
  String as ASTString,
} from 'php-parser'

import path from 'ramda/src/path'

import {
  RequiredType,
  NullAllowedType,
  VariableType,
} from './moodle-source-schemas'

type BaseVariable = {
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
  type: VariableType.Values.UNKNOWN,
  required: RequiredType.Values.VALUE_OPTIONAL,
  allownull: NullAllowedType.Values.NULL_ALLOWED,
}

export type ParsedFunctions = Record<
  string,
  {
    params?: ParsedVariable
    returnType?: ParsedVariable
    description?: string
  }
>

export type ParseResult = {
  package: string[]
  functions: ParsedFunctions
}

const TypeMap = {
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
  array: undefined as Array | undefined,
  name: undefined as Name | undefined,
}
type RemoveValueUndefined<T> = {
  [K in keyof T]: NonNullable<T[K]>
}
type TypeMap = RemoveValueUndefined<typeof TypeMap>

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
export const typeRelaxChecked = <T extends keyof TypeMap>(
  node: any,
  type: T,
): TypeMap[T] | undefined => {
  if (path(['kind'], node) === type) {
    return node as unknown as TypeMap[T]
  }
  return undefined
}
export const typeChecked = <T extends keyof TypeMap>(
  node: any,
  type: T,
): TypeMap[T] => {
  if (typeRelaxChecked(node, type)) {
    return node as unknown as TypeMap[T]
  }
  throw new Error(
    `Type check failed - ${type} expected but ${path(['kind'], node)} found`,
  )
}
export const isType =
  <T extends keyof TypeMap>(type: T) =>
  (node: any): node is TypeMap[T] =>
    path(['kind'], node) === type
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
