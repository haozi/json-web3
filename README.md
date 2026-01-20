# json-web3

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
  data: new Uint8Array([1, 2, 3, 255]),
}

const text = jsonWeb3.stringify(payload)
// => {"balance":{"__@json.bigint__":"1234567890123456789"},"decimals":{"__@json.bigint__":"18"},"data":{"__@json.bytes__":"0x010203ff"}}

const restored = jsonWeb3.parse(text)
/* => 
  {
    "balance": 1234567890123456789n,
    "decimals": 18n,
    "data": Uint8Array(4) [1, 2, 3, 255]
  }
*/
```

## API (Fully compatible with native globalThis.JSON)

- `stringify(value, replacer?, space?)`
- `parse(text, reviver?)`

## Notes

`bigint` values are encoded as objects: `{"__@json.bigint__":"<value>"}`. `Uint8Array`/`ArrayBuffer` (and Node `Buffer` JSON shapes) are encoded as `{"__@json.bytes__":"0x..."}` and decoded back to `Uint8Array`.
