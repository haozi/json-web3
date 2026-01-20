import { Script, createContext } from 'node:vm'
import { describe, expect, it } from 'vitest'
import jsonWeb3, { parse, parse_UNSAFE, stringify, stringify_UNSAFE } from '../src/index'
import { getTypedArrayName, isBuffer } from '../src/utils'

describe('json-web3', () => {
  it('serializes and deserializes bigint values', () => {
    const input = {
      balance: 1n,
      decimals: 18,
      nested: {
        big: 9999999999999999999n,
      },
      list: [2n, 3n],
    }

    const text = jsonWeb3.stringify(input)
    const output = jsonWeb3.parse(text)

    expect(output.balance).toBe(1n)
    expect(output.decimals).toBe(18)
    expect(output.nested.big).toBe(9999999999999999999n)
    expect(output.list).toEqual([2n, 3n])
  })

  it('keeps non-bigint values unchanged', () => {
    const input = { balance: 10, decimals: 6, active: true }
    const text = stringify(input)
    const output = parse(text)

    expect(output).toEqual(input)
  })

  it('supports JSON.stringify replacer function', () => {
    const text = stringify({ balance: 1 }, (key, value) => (key === 'balance' ? 42n : value))
    const output = parse(text)

    expect(output.balance).toBe(42n)
  })

  it('supports JSON.stringify replacer array', () => {
    const text = stringify({ balance: 1n, decimals: 18, symbol: 'ETH' }, ['balance', 'decimals'])
    const output = parse(text)

    expect(output).toEqual({ balance: 1n, decimals: 18 })
  })

  it('serializes and deserializes Uint8Array bytes', () => {
    const input = { data: new Uint8Array([1, 2, 3, 255]) }
    const text = stringify(input)
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1, 2, 3, 255])
  })

  it('serializes cross-realm Uint8Array bytes', () => {
    const context = createContext({})
    const script = new Script('u = new Uint8Array([1, 2, 3, 255])')
    script.runInContext(context)
    const foreign = (context as any).u

    const text = stringify({ data: foreign })
    const output = parse(text)

    expect(text).toContain('__@json.typedarray__')
    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1, 2, 3, 255])
  })

  it('serializes Buffer as bytes when available', () => {
    if (typeof Buffer === 'undefined') return
    const input = { data: Buffer.from([4, 5, 6]) }
    const text = stringify(input)
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([4, 5, 6])
  })

  it('getTypedArrayName falls back to Object.prototype.toString tag', () => {
    const fake = { [Symbol.toStringTag]: 'Uint8Array', constructor: undefined }
    expect(getTypedArrayName(fake)).toBe('Uint8Array')
  })

  it('getTypedArrayName returns null for undefined', () => {
    expect(getTypedArrayName(undefined)).toBeNull()
  })

  it('supports JSON.parse reviver after decoding', () => {
    const text = stringify({ balance: 7n })
    const output = parse(text, (_, value) => (typeof value === 'bigint' ? value.toString() : value))

    expect(output.balance).toBe('7')
  })

  it('handles root bigint value', () => {
    const text = stringify(123n)
    const output = parse(text)
    expect(output).toBe(123n)
  })

  it('handles root Uint8Array value', () => {
    const input = new Uint8Array([0, 1, 255])
    const text = stringify(input)
    const output = parse(text)

    expect(output).toBeInstanceOf(Uint8Array)
    expect(Array.from(output)).toEqual([0, 1, 255])
  })

  it('handles root Buffer value when available', () => {
    if (typeof Buffer === 'undefined') return
    const input = Buffer.from([10, 11, 12])
    const text = stringify(input)
    const output = parse(text)

    expect(output).toBeInstanceOf(Uint8Array)
    expect(Array.from(output)).toEqual([10, 11, 12])
  })

  it('handles ArrayBuffer value as bytes', () => {
    const ab = new ArrayBuffer(4)
    new Uint8Array(ab).set([9, 8, 7, 6])

    const text = stringify({ ab })
    const output = parse(text)

    expect(output.ab).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.ab)).toEqual([9, 8, 7, 6])
  })

  it('does not mutate JSON primitives and null', () => {
    const input = {
      s: 'x',
      n: 0,
      b: false,
      z: null,
    }
    const text = stringify(input)
    const output = parse(text)
    expect(output).toEqual(input)
  })

  it('preserves undefined in object as JSON.stringify does (dropped)', () => {
    const input: any = { a: 1, u: undefined }
    const text = stringify(input)
    expect(text).toBe('{"a":1}')
    const output = parse(text)
    expect(output).toEqual({ a: 1 })
  })

  it('preserves undefined in array as JSON.stringify does (null)', () => {
    const input: any = [1, undefined, 3]
    const text = stringify(input)
    expect(text).toBe('[1,null,3]')
    const output = parse(text)
    expect(output).toEqual([1, null, 3])
  })

  it('round-trips NaN and Infinity', () => {
    const input = { nan: Number.NaN, inf: Number.POSITIVE_INFINITY, ninf: Number.NEGATIVE_INFINITY }
    const text = stringify(input)
    const output = parse(text)
    expect(Number.isNaN(output.nan)).toBe(true)
    expect(output.inf).toBe(Number.POSITIVE_INFINITY)
    expect(output.ninf).toBe(Number.NEGATIVE_INFINITY)
  })

  it('serializes Date using timestamp and restores Date on parse', () => {
    const d = new Date('2020-01-02T03:04:05.006Z')
    const text = stringify({ d })
    const output = parse(text)

    expect(output.d).toBeInstanceOf(Date)
    expect(output.d.getTime()).toBe(d.getTime())
  })

  it('round-trips Map, Set, RegExp, URL, and Function with stringify_UNSAFE + parse_UNSAFE', () => {
    function echo(arg: string) {
      return arg
    }
    const input = {
      map: new Map([['hello', 'world']]),
      set: new Set([123, 456]),
      re: /([^\s]+)/g,
      url: new URL('https://example.com/'),
      fn: echo,
    }
    const text = stringify_UNSAFE(input)
    const output = parse_UNSAFE(text)

    expect(output.map).toBeInstanceOf(Map)
    expect(Array.from(output.map.entries())).toEqual([['hello', 'world']])
    expect(output.set).toBeInstanceOf(Set)
    expect(Array.from(output.set.values())).toEqual([123, 456])
    expect(output.re).toBeInstanceOf(RegExp)
    expect(output.re.source).toBe('([^\\s]+)')
    expect(output.re.flags).toBe('g')
    expect(output.url).toBeInstanceOf(URL)
    expect(output.url.toString()).toBe('https://example.com/')
    expect(typeof output.fn).toBe('function')
    expect(output.fn('ok')).toBe('ok')
  })

  it('supports space argument formatting', () => {
    const text = stringify({ a: 1, b: 2 }, null, 2)
    expect(text).toContain('\n')
    expect(text).toContain('  "a": 1')
  })

  it('replacer array should not filter internal tags keys (coverage for BIGINT_TAG/TYPEDARRAY_TAG)', () => {
    const input = { a: 1n, b: new Uint8Array([1, 2]) }
    const text = stringify(input, ['a']) // filter out b
    const output = parse(text)

    expect(output).toEqual({ a: 1n })
  })

  it('replacer array does not drop typed array tag keys', () => {
    const input = { data: { '__@json.typedarray__': { type: 'Uint8Array', bytes: '0x01' } } }
    const text = stringify(input, ['data'])
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1])
  })

  it('replacer array does not drop new internal tag keys', () => {
    const input = {
      d: new Date('2020-01-02T03:04:05.006Z'),
      inf: Number.POSITIVE_INFINITY,
      map: new Map([['hello', 'world']]),
      set: new Set([123, 456]),
      re: /([^\s]+)/g,
      url: new URL('https://example.com/'),
      fn: (arg: string) => arg,
    }
    const text = stringify_UNSAFE(input, ['d', 'inf', 'map', 'set', 're', 'url', 'fn'])
    const output = parse_UNSAFE(text)

    expect(output.d).toBeInstanceOf(Date)
    expect(output.d.getTime()).toBe(input.d.getTime())
    expect(output.inf).toBe(Number.POSITIVE_INFINITY)
    expect(output.map).toBeInstanceOf(Map)
    expect(Array.from(output.map.entries())).toEqual([['hello', 'world']])
    expect(output.set).toBeInstanceOf(Set)
    expect(Array.from(output.set.values())).toEqual([123, 456])
    expect(output.re).toBeInstanceOf(RegExp)
    expect(output.re.source).toBe('([^\\s]+)')
    expect(output.re.flags).toBe('g')
    expect(output.url).toBeInstanceOf(URL)
    expect(output.url.toString()).toBe('https://example.com/')
    expect(typeof output.fn).toBe('function')
    expect(output.fn('ok')).toBe('ok')
  })

  it('replacer function: returning undefined drops property like JSON.stringify', () => {
    const input = { a: 1n, b: 2 }
    const text = stringify(input, (key, value) => (key === 'b' ? undefined : value))
    const output = parse(text)

    expect(output).toEqual({ a: 1n })
  })

  it('replacer function: can transform bytes into bigint and still round-trip', () => {
    const input = { v: 1, data: new Uint8Array([1, 2, 3]) }
    const text = stringify(input, (key, value) => (key === 'v' ? 9007199254740993n : value))
    const output = parse(text)

    expect(output.v).toBe(9007199254740993n)
    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1, 2, 3])
  })

  it('parse should throw on invalid typed array bytes hex string', () => {
    // normalized length is odd -> fromHex throws
    const bad = '{"data":{"__@json.typedarray__":{"type":"Uint8Array","bytes":"0xabc"}}}'
    expect(() => parse(bad)).toThrowError(/Invalid hex string for bytes/)
  })

  it('parse throws on invalid payloads for new types (except function)', () => {
    const cases = [
      '{"x":{"__@json.number__":"bad"}}',
      '{"x":{"__@json.map__":123}}',
      '{"x":{"__@json.set__":123}}',
      '{"x":{"__@json.regexp__":{"source":1,"flags":[]}}}',
      '{"x":{"__@json.url__":123}}',
    ]

    for (const text of cases) {
      expect(() => parse(text)).toThrowError()
    }
  })

  it('parse_UNSAFE throws on invalid function payloads', () => {
    const text = '{"x":{"__@json.function__":123}}'
    expect(() => parse_UNSAFE(text)).toThrowError()
  })

  it('falls back to raw bytes when typed array type is unknown', () => {
    const text = '{"__@json.typedarray__":{"type":"UnknownArray","bytes":"0x01"}}'
    const output = parse(text)
    expect(output).toBeInstanceOf(Uint8Array)
    expect(Array.from(output)).toEqual([1])
  })

  it('parses typed array bytes without 0x prefix', () => {
    const text = '{"data":{"__@json.typedarray__":{"type":"Uint8Array","bytes":"0102ff"}}}'
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1, 2, 255])
  })

  it('falls back to manual hex decoding when Buffer is unavailable', () => {
    if (typeof Buffer === 'undefined') return
    const original = Buffer
    ;(globalThis as any).Buffer = undefined

    try {
      const text = '{"data":{"__@json.typedarray__":{"type":"Uint8Array","bytes":"0x0a0b"}}}'
      const output = parse(text)
      expect(output.data).toBeInstanceOf(Uint8Array)
      expect(Array.from(output.data)).toEqual([10, 11])
    } finally {
      ;(globalThis as any).Buffer = original
    }
  })

  it('parses bigint tag from string', () => {
    const text = '{"x":{"__@json.bigint__":"0"}}'
    const output = parse(text)
    expect(output.x).toBe(0n)
  })

  it('throws if bigint tag is not a valid bigint literal', () => {
    const text = '{"x":{"__@json.bigint__":"not-a-bigint"}}'
    expect(() => parse(text)).toThrow()
  })

  it('handles nested tag-shaped objects as a decoding contract (will decode)', () => {
    // This documents current behavior: any object with own BIGINT_TAG will decode to bigint.
    const input = { x: { '__@json.bigint__': '123' } as any }
    const text = RAW_STRINGIFY(input)
    const output = parse(text)

    expect(output.x).toBe(123n)

    function RAW_STRINGIFY(v: any) {
      return JSON.stringify(v)
    }
  })

  it('serializes "Buffer-like JSON" object { type: "Buffer", data: number[] } into bytes', () => {
    const input = { data: { type: 'Buffer', data: [0, 16, 255] } }
    const text = stringify(input)
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([0, 16, 255])
  })

  it('parses raw Buffer-like JSON object into bytes', () => {
    const text = '{"data":{"type":"Buffer","data":[1,2,3]}}'
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1, 2, 3])
  })

  it('does not treat { type: "Buffer", data: [...] } as bytes if shape is not strict (extra keys)', () => {
    const input: any = { data: { type: 'Buffer', data: [1, 2, 3], extra: true } }
    const text = stringify(input)
    const output = parse(text)

    // stringify: current implementation only converts strict {type,data} (2 keys) in toSerializable,
    // so here it should remain plain object.
    expect(output).toEqual(input)
    expect(output.data).not.toBeInstanceOf(Uint8Array)
  })

  it('reviver can observe decoded Uint8Array', () => {
    const text = stringify({ data: new Uint8Array([1, 2]) })
    const output = parse(text, (key, value) => {
      if (key === 'data' && value instanceof Uint8Array) return Array.from(value).join(',')
      return value
    })

    expect(output.data).toBe('1,2')
  })

  it('serializes and parses empty bytes', () => {
    const input = { data: new Uint8Array([]) }
    const text = stringify(input)
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([])
  })

  it('round-trips large bytes', () => {
    const bytes = new Uint8Array(1024)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256

    const text = stringify({ bytes })
    const output = parse(text)

    expect(output.bytes).toBeInstanceOf(Uint8Array)
    expect(output.bytes.length).toBe(1024)
    // spot check
    expect(output.bytes[0]).toBe(0)
    expect(output.bytes[1]).toBe(1)
    expect(output.bytes[255]).toBe(255)
    expect(output.bytes[256]).toBe(0)
  })

  it('symbol is dropped while function is preserved with stringify_UNSAFE + parse_UNSAFE', () => {
    const sym = Symbol('x')
    const input: any = { a: 1, s: sym, f: (arg: string) => arg }
    const text = stringify_UNSAFE(input)
    const output = parse_UNSAFE(text)
    expect(output.a).toBe(1)
    expect(output.s).toBeUndefined()
    expect(typeof output.f).toBe('function')
    expect(output.f('ok')).toBe('ok')
  })

  it('parse keeps function payloads as tagged objects', () => {
    const input = { fn: (arg: string) => arg }
    const text = stringify_UNSAFE(input)
    const output = parse(text)

    expect(output.fn).toEqual({ '__@json.function__': expect.any(String) })
  })

  it('stringify drops function by default', () => {
    const input = { fn: (arg: string) => arg }
    const text = stringify(input)
    const output = parse(text)
    expect(output).toEqual({})
  })

  it('BigInt in array with replacer array filtering works as expected', () => {
    const input = { list: [1n, 2n], other: 3n }
    const text = stringify(input, ['list'])
    const output = parse(text)
    expect(output).toEqual({ list: [1n, 2n] })
  })

  it('decodes typed array tag at root', () => {
    const text = '{"__@json.typedarray__":{"type":"Uint8Array","bytes":"0x0a0b"}}'
    const output = parse(text)

    expect(output).toBeInstanceOf(Uint8Array)
    expect(Array.from(output)).toEqual([10, 11])
  })

  it('supports typed arrays round-trip', () => {
    const cases: Array<{ name: string; ctor: any; values: any[] }> = [
      { name: 'Uint8ClampedArray', ctor: Uint8ClampedArray, values: [0, 255, 128] },
      { name: 'Uint16Array', ctor: Uint16Array, values: [1, 256, 65535] },
      { name: 'Uint32Array', ctor: Uint32Array, values: [1, 65536, 4294967295] },
      { name: 'Int8Array', ctor: Int8Array, values: [-128, -1, 0, 127] },
      { name: 'Int16Array', ctor: Int16Array, values: [-32768, -1, 0, 32767] },
      { name: 'Int32Array', ctor: Int32Array, values: [-2147483648, -1, 0, 2147483647] },
      {
        name: 'Float16Array',
        ctor: typeof Float16Array !== 'undefined' ? Float16Array : undefined,
        values: [1.5, -2.25, 3.125],
      },
      { name: 'Float32Array', ctor: Float32Array, values: [1.5, -2.25, 3] },
      { name: 'Float64Array', ctor: Float64Array, values: [1.5, -2.25, 3] },
      {
        name: 'BigInt64Array',
        ctor: typeof BigInt64Array !== 'undefined' ? BigInt64Array : undefined,
        values: [1n, -2n, 3n],
      },
      {
        name: 'BigUint64Array',
        ctor: typeof BigUint64Array !== 'undefined' ? BigUint64Array : undefined,
        values: [1n, 2n, 3n],
      },
    ]

    for (const { name, ctor, values } of cases) {
      if (!ctor) continue
      const input = { data: new ctor(values as any) }
      const text = stringify(input)
      const output = parse(text)

      expect(text).toContain('__@json.typedarray__')
      expect(output.data).toBeInstanceOf(ctor)
      const expected = name === 'Float16Array' ? Array.from(new ctor(values as any)) : values
      expect(Array.from(output.data)).toEqual(expected)
    }
  })

  it('throws if typed array bytes is not a string', () => {
    const text = '{"data":{"__@json.typedarray__":{"type":"Uint8Array","bytes":123}}}'
    expect(() => parse(text)).toThrow()
  })

  it('does not treat Buffer-like JSON with out-of-range data as bytes', () => {
    const input: any = { data: { type: 'Buffer', data: [-1, 256] } }
    const text = stringify(input)
    const output = parse(text)

    expect(output).toEqual(input)
    expect(output.data).not.toBeInstanceOf(Uint8Array)
  })

  it('parses empty typed array bytes', () => {
    const text = '{"data":{"__@json.typedarray__":{"type":"Uint8Array","bytes":"0x"}}}'
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([])
  })

  it('handles toJSON returning bigint', () => {
    const input = {
      wrap: {
        toJSON() {
          return 1234567890123456789n
        },
      },
    }
    const text = stringify(input)
    const output = parse(text)

    expect(output.wrap).toBe(1234567890123456789n)
  })

  it('isBuffer returns false when Buffer is unavailable', () => {
    if (typeof Buffer === 'undefined') return
    const original = Buffer
    ;(globalThis as any).Buffer = undefined

    try {
      expect(isBuffer(new Uint8Array([1, 2]))).toBe(false)
    } finally {
      ;(globalThis as any).Buffer = original
    }
  })

  it('isBuffer returns true for Buffer instances', () => {
    if (typeof Buffer === 'undefined') return
    const input = Buffer.from([1, 2, 3])
    expect(isBuffer(input)).toBe(true)
    expect(isBuffer(new Uint8Array([1, 2, 3]))).toBe(false)
  })
})
