import jsonWeb3 from '../src/index'
const payload = {
  balance: 1234567890123456789n,
  decimals: 18n,
  u8Array: new Uint8Array([1, 2, 3, 255]),
  u16Array: new Uint16Array([1, 2, 3, 255]),
  bigIntArray: new BigInt64Array([18446744073709551615n, 2n, 3n, 255n]),
  createdAt: new Date('2020-01-02T03:04:05.006Z'),
  ids: new Set([123, 456]),
  headers: new Map([['hello', 'world']]),
  re: /([^\s]+)/g,
  url: new URL('https://example.com/'),
  fn: function echo(arg) {
    return arg
  },
}

const text = jsonWeb3.stringify(payload, null, 2)
console.log('text', text)
const restored = jsonWeb3.parse(text)
console.log('restored', restored)
