import {
  BIGINT_TAG,
  BYTES_TAG,
  fromSerializable,
  isArray,
  isFunction,
  toSerializable,
  undefined,
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
    if (key === BYTES_TAG) return value
    if (isArray(holder)) return value
    return replacer.includes(key) ? value : undefined
  }
  return value
}

export const stringify = (value: any, replacer: Replacer = null, space?: string | number): string =>
  RAW_JSON.stringify(
    value,
    function replacerFn(key, v) {
      const replaced = applyReplacer(this, key, v, replacer)
      return toSerializable(replaced)
    },
    space,
  )

export const parse = (text: string, reviver: Reviver = null): any =>
  RAW_JSON.parse(text, (key, v) => {
    const decoded = fromSerializable(v)
    return typeof reviver === 'function' ? reviver(key, decoded) : decoded
  })

export default {
  stringify,
  parse,
}
