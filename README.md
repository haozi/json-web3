# json-web3

[![GitHub Workflow Status (with event)](https://img.shields.io/github/actions/workflow/status/haozi/json-web3/deploy.yml)](https://github.com/haozi/json-web3/actions)
[![npm](https://img.shields.io/npm/v/json-web3.svg)](https://www.npmjs.com/package/json-web3)
[![codecov](https://codecov.io/gh/haozi/json-web3/branch/main/graph/badge.svg)](https://app.codecov.io/gh/haozi/json-web3)
[![contributors](https://img.shields.io/github/contributors/haozi/json-web3)](https://github.com/haozi/json-web3/graphs/contributors)
[![LICENSE](https://img.shields.io/npm/l/json-web3)](https://github.com/haozi/json-web3/blob/main/LICENSE)
[![Size](https://img.shields.io/bundlejs/size/json-web3.svg)](https://cdn.jsdelivr.net/npm/json-web3/+esm)

BigInt-safe JSON serialization and deserialization for Web3 data.

## Install

```bash
pnpm add json-web3
# or
npm i json-web3
# or
yarn add json-web3
```

## Usage

```ts
import jsonWeb3 from 'json-web3'

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

const text = jsonWeb3.stringify(payload)
// => {"balance":{"__@json.bigint__":"1234567890123456789"},"decimals":{"__@json.bigint__":"18"},"u8Array":{"__@json.typedarray__":{"type":"Uint8Array","bytes":"0x010203ff"}},"u16Array":{"__@json.typedarray__":{"type":"Uint16Array","bytes":"0x010002000300ff00"}},"bigIntArray":{"__@json.typedarray__":{"type":"BigInt64Array","bytes":"0xffffffffffffffff02000000000000000300000000000000ff00000000000000"}}}

const restored = jsonWeb3.parse(text)
/* =>
  {
    balance: 1234567890123456789n,
    decimals: 18n,
    u8Array: Uint8Array(4) [1, 2, 3, 255]...,
    u16Array: Uint16Array(4)...,
    bigIntArray: BigInt64Array(4)...,
    createdAt: Date(...),
    ids: Set(2) {...},
    headers: Map(1) {...},
    re: /([^\s]+)/g,
    url: URL(...),
    fn: undefined
  }
*/

const textUnsafe = jsonWeb3.stringify_UNSAFE(payload)
const restoredUnsafe = jsonWeb3.parse_UNSAFE(textUnsafe)
// restoredUnsafe.fn is a callable function
```

## Full example

```ts
import jsonWeb3 from 'json-web3'

window.JSON = jsonWeb3 // Yes, you can replace it directly; it is fully compatible.
```

## API (Fully compatible with native globalThis.JSON)

- `stringify(value, replacer?, space?)`
- `parse(text, reviver?)`
- `stringify_UNSAFE(value, replacer?, space?)` (serializes `Function` payloads)
- `parse_UNSAFE(text, reviver?)` (revives `Function` payloads via `new Function(...)`)

## Type support

| type                | supported by standard JSON? | supported by json-web3?               |
| ------------------- | --------------------------- | ------------------------------------- |
| `string`            | ✅                          | ✅                                    |
| `number`            | ✅                          | ✅                                    |
| `boolean`           | ✅                          | ✅                                    |
| `null`              | ✅                          | ✅                                    |
| `Array`             | ✅                          | ✅                                    |
| `Object`            | ✅                          | ✅                                    |
| `undefined`         | ❌                          | ❌                                    |
| `Infinity`          | ❌                          | ✅                                    |
| `-Infinity`         | ❌                          | ✅                                    |
| `NaN`               | ❌                          | ✅                                    |
| `BigInt`            | ❌                          | ✅                                    |
| `Date`              | ❌                          | ✅                                    |
| `RegExp`            | ❌                          | ✅                                    |
| `Set`               | ❌                          | ✅                                    |
| `Map`               | ❌                          | ✅                                    |
| `URL`               | ❌                          | ✅                                    |
| `ArrayBuffer`       | ❌                          | ✅                                    |
| `Uint8Array`        | ❌                          | ✅                                    |
| `Uint8ClampedArray` | ❌                          | ✅                                    |
| `Uint16Array`       | ❌                          | ✅                                    |
| `Uint32Array`       | ❌                          | ✅                                    |
| `Int8Array`         | ❌                          | ✅                                    |
| `Int16Array`        | ❌                          | ✅                                    |
| `Int32Array`        | ❌                          | ✅                                    |
| `Float16Array`      | ❌                          | ✅                                    |
| `Float32Array`      | ❌                          | ✅                                    |
| `Float64Array`      | ❌                          | ✅                                    |
| `BigInt64Array`     | ❌                          | ✅                                    |
| `BigUint64Array`    | ❌                          | ✅                                    |
| `Function`          | ❌                          | ✅ ⚠️(use UNSAFE api, it's dangerous) |

## Note

- `bigint` values are encoded as objects: `{"__@json.bigint__":"<value>"}`.
- Non-finite numbers (`NaN`, `Infinity`, `-Infinity`) are encoded as `{"__@json.number__":"<value>"}`.
- `Date` values are encoded as `{"__@json.date__":<timestamp>}`.
- `Map` values are encoded as `{"__@json.map__":[[k,v],...]}` and `Set` values as `{"__@json.set__":[...]}`.
- `RegExp` values are encoded as `{"__@json.regexp__":{"source":"...","flags":"..."}}`.
- `URL` values are encoded as `{"__@json.url__":"..."}`.
- `Function` values are encoded as `{"__@json.function__":"<source>"}` by `stringify_UNSAFE` and are only revived by `parse_UNSAFE` using `new Function(...)` (using the UNSAFE function pair is dangerous; make sure your data is trusted).
- `ArrayBuffer` values are encoded as `{"__@json.arraybuffer__":{"bytes":"0x..."}}` and decoded back to `ArrayBuffer`.
- Node `Buffer` JSON shapes and typed arrays are encoded as `{"__@json.typedarray__":{"type":"<Name>","bytes":"0x..."}}` and decoded back to the original typed array (`Uint8Array`, `Uint8ClampedArray`, `Uint16Array`, `Uint32Array`, `Int8Array`, `Int16Array`, `Int32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`).

Compared to libraries that require eval-based parsing (for example, `serialize-javascript`), this approach is generally safer and more efficient.
