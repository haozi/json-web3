import { describe, expect, it } from 'vitest'
import jsonWeb3, { parse, stringify } from '../src/index'

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
})
