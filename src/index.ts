const BIGINT_TAG = '__@json.bigint__'
const RAW_JSON = JSON
type Replacer = ((this: any, key: string, value: any) => any) | Array<string | number> | null

const applyReplacer = (key: string, value: any, replacer: Replacer): any => {
  if (typeof replacer === 'function') {
    return replacer(key, value)
  }
  if (Array.isArray(replacer)) {
    if (key === '') return value
    if (key === BIGINT_TAG) return value
    return replacer.includes(key) ? value : undefined
  }
  return value
}

const toSerializable = (value: any): any =>
  typeof value === 'bigint' ? { [BIGINT_TAG]: value.toString() } : value

export const stringify = (value: any, replacer: Replacer = null, space?: string | number): string =>
  RAW_JSON.stringify(
    value,
    (key, v) => {
      const replaced = applyReplacer(key, v, replacer)
      return toSerializable(replaced)
    },
    space,
  )

export const parse = (text: string): any =>
  RAW_JSON.parse(text, (_, v) =>
    v && typeof v === 'object' && BIGINT_TAG in v ? BigInt(v[BIGINT_TAG]) : v,
  )

export default {
  stringify,
  parse,
}
