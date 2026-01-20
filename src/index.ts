import {
  BIGINT_TAG,
  DATE_TAG,
  fromSerializable,
  FUNCTION_TAG,
  isArray,
  isDate,
  isFunction,
  isRegExpPayload,
  isTypedArrayPayload,
  isURL,
  MAP_TAG,
  NUMBER_TAG,
  REGEXP_TAG,
  SET_TAG,
  toSerializable,
  TYPEDARRAY_TAG,
  undefined,
  URL_TAG,
} from './utils'

const RAW_JSON = JSON
type Replacer = ((this: any, key: string, value: any) => any) | Array<string | number> | null
type Reviver = ((this: any, key: string, value: any) => any) | null

const applyReplacer = (holder: any, key: string, value: any, replacer: Replacer): any => {
  if (isFunction(replacer)) {
    return replacer(key, value)
  }
  if (isArray(replacer)) {
    if (key === '') return value
    if (key === BIGINT_TAG) return value
    if (key === DATE_TAG) return value
    if (key === NUMBER_TAG) return value
    if (key === MAP_TAG) return value
    if (key === SET_TAG) return value
    if (key === REGEXP_TAG) return value
    if (key === URL_TAG) return value
    if (key === FUNCTION_TAG) return value
    if (key === TYPEDARRAY_TAG) return value
    if (isTypedArrayPayload(holder)) return value
    if (isRegExpPayload(holder)) return value
    if (isArray(holder)) return value
    return replacer.includes(key) ? value : undefined
  }
  return value
}

export const stringify = (value: any, replacer: Replacer = null, space?: string | number): string =>
  RAW_JSON.stringify(
    value,
    function replacerFn(key, v) {
      const holderValue = this && key in Object(this) ? (this as any)[key] : v
      const candidate = isDate(holderValue) || isURL(holderValue) ? holderValue : v
      const replaced = applyReplacer(this, key, candidate, replacer)
      return toSerializable(replaced)
    },
    space,
  )

export const stringify_UNSAFE = (
  value: any,
  replacer: Replacer = null,
  space?: string | number,
): string =>
  RAW_JSON.stringify(
    value,
    function replacerFn(key, v) {
      const holderValue = this && key in Object(this) ? (this as any)[key] : v
      const candidate = isDate(holderValue) || isURL(holderValue) ? holderValue : v
      const replaced = applyReplacer(this, key, candidate, replacer)
      return toSerializable(replaced, { allowFunction: true })
    },
    space,
  )

export const parse = <T = any>(text: string, reviver: Reviver = null): T =>
  RAW_JSON.parse(text, (key, v) => {
    const decoded = fromSerializable(v)
    return isFunction(reviver) ? reviver(key, decoded) : decoded
  })

export const parse_UNSAFE = <T = any>(text: string, reviver: Reviver = null): T =>
  RAW_JSON.parse(text, (key, v) => {
    const decoded = fromSerializable(v, { allowFunction: true })
    return isFunction(reviver) ? reviver(key, decoded) : decoded
  })

export default {
  stringify,
  parse,
  stringify_UNSAFE,
  parse_UNSAFE,
}
