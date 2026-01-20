import { describe, expect, it } from 'vitest'
import jsonWeb3, { parse, stringify } from '../src/index'
import { isBuffer } from '../src/utils'

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

  it('serializes Buffer as bytes when available', () => {
    if (typeof Buffer === 'undefined') return
    const input = { data: Buffer.from([4, 5, 6]) }
    const text = stringify(input)
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([4, 5, 6])
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

  it('preserves NaN and Infinity as JSON.stringify does (null)', () => {
    const input = { nan: Number.NaN, inf: Number.POSITIVE_INFINITY, ninf: Number.NEGATIVE_INFINITY }
    const text = stringify(input)
    expect(text).toBe('{"nan":null,"inf":null,"ninf":null}')
    const output = parse(text)
    expect(output).toEqual({ nan: null, inf: null, ninf: null })
  })

  it('serializes Date like JSON.stringify (ISO string)', () => {
    const d = new Date('2020-01-02T03:04:05.006Z')
    const text = stringify({ d })
    const output = parse(text)

    expect(typeof output.d).toBe('string')
    expect(output.d).toBe(d.toJSON())
  })

  it('supports space argument formatting', () => {
    const text = stringify({ a: 1, b: 2 }, null, 2)
    expect(text).toContain('\n')
    expect(text).toContain('  "a": 1')
  })

  it('replacer array should not filter internal tags keys (coverage for BIGINT_TAG/BYTES_TAG)', () => {
    const input = { a: 1n, b: new Uint8Array([1, 2]) }
    const text = stringify(input, ['a']) // filter out b
    const output = parse(text)

    expect(output).toEqual({ a: 1n })
  })

  it('replacer array does not drop bytes tag keys', () => {
    const input = { data: { '__@json.bytes__': '0x01' } }
    const text = stringify(input, ['data'])
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1])
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

  it('parse should throw on invalid bytes hex string', () => {
    // normalized length is odd -> fromHex throws
    const bad = '{"data":{"__@json.bytes__":"0xabc"}}'
    expect(() => parse(bad)).toThrowError(/Invalid hex string for bytes/)
  })

  it('parses bytes tag without 0x prefix', () => {
    const text = '{"data":{"__@json.bytes__":"0102ff"}}'
    const output = parse(text)

    expect(output.data).toBeInstanceOf(Uint8Array)
    expect(Array.from(output.data)).toEqual([1, 2, 255])
  })

  it('falls back to manual hex decoding when Buffer is unavailable', () => {
    if (typeof Buffer === 'undefined') return
    const original = Buffer
    ;(globalThis as any).Buffer = undefined

    try {
      const text = '{"data":{"__@json.bytes__":"0x0a0b"}}'
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

  it('symbol and function behavior matches JSON.stringify (dropped)', () => {
    const sym = Symbol('x')
    const input: any = { a: 1, s: sym, f: () => 1 }
    const text = stringify(input)
    expect(text).toBe('{"a":1}')
    const output = parse(text)
    expect(output).toEqual({ a: 1 })
  })

  it('BigInt in array with replacer array filtering works as expected', () => {
    const input = { list: [1n, 2n], other: 3n }
    const text = stringify(input, ['list'])
    const output = parse(text)
    expect(output).toEqual({ list: [1n, 2n] })
  })

  it('decodes bytes tag at root', () => {
    const text = '{"__@json.bytes__":"0x0a0b"}'
    const output = parse(text)

    expect(output).toBeInstanceOf(Uint8Array)
    expect(Array.from(output)).toEqual([10, 11])
  })

  it('does not treat non-Uint8Array typed arrays as bytes', () => {
    const input = { data: new Uint16Array([1, 256]) }
    const text = stringify(input)
    const output = parse(text)

    expect(text).toBe('{"data":{"0":1,"1":256}}')
    expect(output).toEqual({ data: { 0: 1, 1: 256 } })
  })

  it('throws if bytes tag is not a string', () => {
    const text = '{"data":{"__@json.bytes__":123}}'
    expect(() => parse(text)).toThrow()
  })

  it('does not treat Buffer-like JSON with out-of-range data as bytes', () => {
    const input: any = { data: { type: 'Buffer', data: [-1, 256] } }
    const text = stringify(input)
    const output = parse(text)

    expect(output).toEqual(input)
    expect(output.data).not.toBeInstanceOf(Uint8Array)
  })

  it('parses empty bytes tag', () => {
    const text = '{"data":{"__@json.bytes__":"0x"}}'
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
