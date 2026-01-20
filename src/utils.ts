export const BIGINT_TAG = '__@json.bigint__'
export const TYPEDARRAY_TAG = '__@json.typedarray__'
export const ARRAYBUFFER_TAG = '__@json.arraybuffer__'
export const DATE_TAG = '__@json.date__'
export const MAP_TAG = '__@json.map__'
export const SET_TAG = '__@json.set__'
export const REGEXP_TAG = '__@json.regexp__'
export const URL_TAG = '__@json.url__'
export const FUNCTION_TAG = '__@json.function__'
export const NUMBER_TAG = '__@json.number__'

const UDF = 'undefined'
export const udf = void UDF

export const isString = (value: any): value is string => typeof value === 'string'
export const hasOwnProperty = (obj: any, prop: string): boolean =>
  Object.prototype.hasOwnProperty.call(obj, prop)
export const isArray = (value: any): value is Array<any> => Array.isArray(value)
export const isObject = (value: any): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !isArray(value)
export const isFunction = (value: any): value is Function => typeof value === 'function'
export const isBigInt = (value: any): value is bigint => typeof value === 'bigint'
export const isDate = (value: any): value is Date => value instanceof Date
export const isMap = (value: any): value is Map<any, any> => value instanceof Map
export const isSet = (value: any): value is Set<any> => value instanceof Set
export const isRegExp = (value: any): value is RegExp => value instanceof RegExp
export const isURL = (value: any): value is URL => typeof URL !== UDF && value instanceof URL
const isNumber = (value: any): value is number => typeof value === 'number'
export const isNonFiniteNumber = (value: any): value is number =>
  isNumber(value) && !Number.isFinite(value)
export const isInteger = (value: any): value is number => Number.isInteger(value)
const hasBuffer = (): boolean => typeof Buffer !== UDF && isFunction(Buffer.isBuffer)

export const isBuffer = (value: any): value is Buffer =>
  hasBuffer() && isFunction(Buffer.isBuffer) && Buffer.isBuffer(value)
export const isArrayBuffer = (value: any): value is ArrayBuffer =>
  typeof ArrayBuffer !== UDF && value instanceof ArrayBuffer

export const isTypedArray = (value: any): value is ArrayBufferView => {
  if (value == null) return false
  if (typeof ArrayBuffer !== UDF && isFunction(ArrayBuffer.isView) && ArrayBuffer.isView(value)) {
    return Object.prototype.toString.call(value) !== '[object DataView]'
  }
  const tag = Object.prototype.toString.call(value)
  return tag.endsWith('Array]') && tag !== '[object Array]'
}

export const getTypedArrayName = (value: any): string | null => {
  if (value == null) return null
  const ctor = (value as any).constructor
  if (ctor && isString(ctor.name)) return ctor.name
  const tag = Object.prototype.toString.call(value)
  const match = /^\[object (.+)\]$/.exec(tag)
  return match ? match[1] : null
}

const TYPEDARRAY_CTORS: Record<string, any> = {
  Int8Array: typeof Int8Array !== UDF ? Int8Array : udf,
  Uint8Array: typeof Uint8Array !== UDF ? Uint8Array : udf,
  Uint8ClampedArray: typeof Uint8ClampedArray !== UDF ? Uint8ClampedArray : udf,

  Int16Array: typeof Int16Array !== UDF ? Int16Array : udf,
  Uint16Array: typeof Uint16Array !== UDF ? Uint16Array : udf,
  Float16Array: typeof Float16Array !== UDF ? Float16Array : udf,

  Int32Array: typeof Int32Array !== UDF ? Int32Array : udf,
  Uint32Array: typeof Uint32Array !== UDF ? Uint32Array : udf,
  Float32Array: typeof Float32Array !== UDF ? Float32Array : udf,

  Float64Array: typeof Float64Array !== UDF ? Float64Array : udf,

  BigInt64Array: typeof BigInt64Array !== UDF ? BigInt64Array : udf,
  BigUint64Array: typeof BigUint64Array !== UDF ? BigUint64Array : udf,
}

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

  if (hasBuffer()) {
    return Uint8Array.from(Buffer.from(normalized, 'hex'))
  }

  const out = new Uint8Array(normalized.length / 2)
  for (let i = 0; i < normalized.length; i += 2) {
    out[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16)
  }
  return out
}

export const toSerializable = (value: any, options: { allowFunction?: boolean } = {}): any => {
  if (isBigInt(value)) {
    return { [BIGINT_TAG]: value.toString() }
  }

  if (isNonFiniteNumber(value)) {
    return { [NUMBER_TAG]: String(value) }
  }
  if (isNumber(value) && !Number.isSafeInteger(value)) {
    throw new Error('Number exceeds safe integer range')
  }

  if (isDate(value)) {
    return { [DATE_TAG]: value.getTime() }
  }

  if (isMap(value)) {
    return { [MAP_TAG]: Array.from(value.entries()) }
  }

  if (isSet(value)) {
    return { [SET_TAG]: Array.from(value.values()) }
  }

  if (isRegExp(value)) {
    return { [REGEXP_TAG]: { source: value.source, flags: value.flags } }
  }

  if (isURL(value)) {
    return { [URL_TAG]: value.toString() }
  }

  if (isFunction(value)) {
    if (!options.allowFunction) {
      return value
    }
    return { [FUNCTION_TAG]: value.toString() }
  }

  if (isTypedArray(value)) {
    const type = getTypedArrayName(value)
    if (type && TYPEDARRAY_CTORS[type]) {
      const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
      return { [TYPEDARRAY_TAG]: { type, bytes: toHex(bytes) } }
    }
  }

  if (isArrayBuffer(value)) {
    return { [ARRAYBUFFER_TAG]: { bytes: toHex(new Uint8Array(value)) } }
  }

  if (
    value &&
    isObject(value) &&
    value.type === 'Buffer' &&
    isArray(value.data) &&
    Object.keys(value).length === 2 &&
    value.data.every((entry: any) => isInteger(entry) && entry >= 0 && entry <= 255)
  ) {
    return { [TYPEDARRAY_TAG]: { type: 'Uint8Array', bytes: toHex(Uint8Array.from(value.data)) } }
  }

  return value
}

export const fromSerializable = (value: any, options: { allowFunction?: boolean } = {}): any => {
  if (value && isObject(value)) {
    if (hasOwnProperty(value, BIGINT_TAG)) {
      return BigInt(value[BIGINT_TAG])
    }
    if (hasOwnProperty(value, NUMBER_TAG)) {
      const payload = value[NUMBER_TAG]
      if (payload === 'NaN') return NaN
      if (payload === 'Infinity') return Infinity
      if (payload === '-Infinity') return -Infinity
      throw new Error('Invalid number payload')
    }
    if (hasOwnProperty(value, DATE_TAG)) {
      return new Date(value[DATE_TAG])
    }
    if (hasOwnProperty(value, MAP_TAG)) {
      const payload = value[MAP_TAG]
      if (!isArray(payload)) {
        throw new Error('Invalid map payload')
      }
      return new Map(payload)
    }
    if (hasOwnProperty(value, SET_TAG)) {
      const payload = value[SET_TAG]
      if (!isArray(payload)) {
        throw new Error('Invalid set payload')
      }
      return new Set(payload)
    }
    if (hasOwnProperty(value, REGEXP_TAG)) {
      const payload = value[REGEXP_TAG]
      if (!payload || !isObject(payload) || !isString(payload.source) || !isString(payload.flags)) {
        throw new Error('Invalid regexp payload')
      }
      return new RegExp(payload.source, payload.flags)
    }
    if (hasOwnProperty(value, URL_TAG)) {
      const payload = value[URL_TAG]
      if (!isString(payload)) {
        throw new Error('Invalid URL payload')
      }
      return new URL(payload)
    }
    if (hasOwnProperty(value, FUNCTION_TAG)) {
      if (!options.allowFunction) {
        return value
      }
      const payload = value[FUNCTION_TAG]
      if (!isString(payload)) {
        throw new Error('Invalid function payload')
      }
      return new Function(`return (${payload})`)()
    }
    if (hasOwnProperty(value, TYPEDARRAY_TAG)) {
      const payload = value[TYPEDARRAY_TAG]
      if (!payload || !isObject(payload) || !isString(payload.type) || !isString(payload.bytes)) {
        throw new Error('Invalid typed array payload')
      }
      const bytes = fromHex(payload.bytes)
      const ctor = TYPEDARRAY_CTORS[payload.type]
      if (!ctor) return bytes
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      return new ctor(buffer)
    }
    if (hasOwnProperty(value, ARRAYBUFFER_TAG)) {
      const payload = value[ARRAYBUFFER_TAG]
      if (!payload || !isObject(payload) || !isString(payload.bytes)) {
        throw new Error('Invalid arraybuffer payload')
      }
      const bytes = fromHex(payload.bytes)
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      return buffer
    }
    if (
      value.type === 'Buffer' &&
      isArray(value.data) &&
      Object.keys(value).length === 2 &&
      value.data.every((entry: any) => isInteger(entry) && entry >= 0 && entry <= 255)
    ) {
      return Uint8Array.from(value.data)
    }
  }
  return value
}

export const isTypedArrayPayload = (value: any): boolean =>
  isObject(value) &&
  isString(value.type) &&
  isString(value.bytes) &&
  Object.keys(value).length === 2

export const isArrayBufferPayload = (value: any): boolean =>
  isObject(value) && isString(value.bytes) && Object.keys(value).length === 1

export const isRegExpPayload = (value: any): boolean =>
  isObject(value) &&
  isString(value.source) &&
  isString(value.flags) &&
  Object.keys(value).length === 2
