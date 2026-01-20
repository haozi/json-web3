export const BIGINT_TAG = '__@json.bigint__'
export const BYTES_TAG = '__@json.bytes__'

export const undefined = void 0
export const isUndefined = (value: any): value is undefined => value === undefined
export const hasOwnProperty = (obj: any, prop: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, prop)
export const isArray = (value: any): value is Array<any> => Array.isArray(value)
export const isObject = (value: any): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !isArray(value)
export const isFunction = (value: any): value is Function => typeof value === 'function'
export const isBigInt = (value: any): value is bigint => typeof value === 'bigint'
export const isBuffer = (value: any): value is Buffer =>
  !isUndefined(Buffer) && isFunction(Buffer.isBuffer) && Buffer.isBuffer(value)
export const isUint8Array = (value: any): value is Uint8Array =>
  !isUndefined(Uint8Array) && value instanceof Uint8Array
export const isArrayBuffer = (value: any): value is ArrayBuffer =>
  !isUndefined(ArrayBuffer) && value instanceof ArrayBuffer

export const toHex = (value: Uint8Array): string => {
  let out = '0x'
  for (const byte of value) {
    out += byte.toString(16).padStart(2, '0')
  }
  return out
}

export const fromHex = (hex: string): Uint8Array => {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex
  if (normalized.length % 2 !== 0) {
    throw new Error('Invalid hex string for bytes')
  }

  if (!isUndefined(Buffer)) {
    return Uint8Array.from(Buffer.from(normalized, 'hex'))
  }

  const out = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }
  return out
}

export const toSerializable = (value: any): any => {
  if (isBigInt(value)) {
    return { [BIGINT_TAG]: value.toString() }
  }

  if (isUint8Array(value)) {
    return { [BYTES_TAG]: toHex(value) }
  }

  if (isArrayBuffer(value)) {
    return { [BYTES_TAG]: toHex(new Uint8Array(value)) }
  }

  if (
    value &&
    isObject(value) &&
    value.type === 'Buffer' &&
    isArray(value.data) &&
    Object.keys(value).length === 2 &&
    value.data.every((entry: any) => Number.isInteger(entry) && entry >= 0 && entry <= 255)
  ) {
    return { [BYTES_TAG]: toHex(Uint8Array.from(value.data)) }
  }

  return value
}

export const fromSerializable = (value: any): any => {
  if (value && isObject(value)) {
    if (hasOwnProperty(value, BIGINT_TAG)) {
      return BigInt(value[BIGINT_TAG])
    }
    if (hasOwnProperty(value, BYTES_TAG)) {
      return fromHex(value[BYTES_TAG])
    }
    if (
      value.type === 'Buffer' &&
      isArray(value.data) &&
      Object.keys(value).length === 2 &&
      value.data.every((entry: any) => Number.isInteger(entry) && entry >= 0 && entry <= 255)
    ) {
      return Uint8Array.from(value.data)
    }
  }
  return value
}
