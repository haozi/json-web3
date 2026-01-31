RFC: JSON-WEB3 Serialization Format
Status: Draft
Version: 1

Abstract
This document specifies a JSON-compatible serialization format used by json-web3
to encode data types that are not supported by standard JSON. The goal is to
enable interoperability across languages by defining canonical tag objects and
payload shapes.

Terminology

- "Tag object" means a JSON object with exactly one of the reserved keys defined
  in this document.
- "Canonical encoding" means the form produced by the reference implementation.
- "Producer" means a serializer that emits this format.
- "Consumer" means a parser that restores values from this format.

1. Data Model
   The format is a superset of JSON that preserves:

- BigInt
- Non-finite numbers (NaN, Infinity, -Infinity)
- Date
- RegExp
- URL
- Map
- Set
- ArrayBuffer
- TypedArray (including BigInt typed arrays)
- Optional: Function (UNSAFE mode only)

2. Reserved Tag Keys
   All tag keys are strings that MUST be used exactly as written:

- "__@json.bigint__"
- "__@json.number__"
- "__@json.date__"
- "__@json.regexp__"
- "__@json.url__"
- "__@json.map__"
- "__@json.set__"
- "__@json.typedarray__"
- "__@json.arraybuffer__"
- "__@json.function__"

3. Encoding Rules (Canonical)
   Producers MUST output one of the following tag objects when the source value
   matches the type. All tag objects SHOULD have no other properties.

3.1 BigInt
{"__@json.bigint__": "<decimal-string>"}
The decimal string MUST be base-10 with optional leading "-" for negative
values. No "+" prefix.

3.2 Non-finite Number
{"__@json.number__": "NaN" | "Infinity" | "-Infinity"}
Finite numbers MUST be encoded as standard JSON numbers, but a producer MUST
reject (or error on) any finite number that exceeds the safe integer range
[-9007199254740991, 9007199254740991].

3.3 Date
{"__@json.date__": <milliseconds-since-epoch>}
The value is a JSON number representing milliseconds since Unix epoch.

3.4 RegExp
{"__@json.regexp__": {"source": "<pattern>", "flags": "<flags>"}}
Both "source" and "flags" MUST be strings.

3.5 URL
{"__@json.url__": "<url-string>"}

3.6 Map
{"__@json.map__": [[k1, v1], [k2, v2], ...]}
The payload MUST be a JSON array of 2-element arrays. Order is preserved.

3.7 Set
{"__@json.set__": [v1, v2, ...]}
Order is preserved.

3.8 TypedArray (and Node.js Buffer JSON shape)
{"__@json.typedarray__": {"type": "<CtorName>", "bytes": "0x..."}}

The "type" field MUST be one of:
Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array,
Int32Array, Uint32Array, Float16Array, Float32Array, Float64Array,
BigInt64Array, BigUint64Array

"bytes" MUST be a hexadecimal string with a "0x" prefix. Canonical encoding
uses lowercase hex. The byte sequence is the raw bytes of the view (respecting
byteOffset and byteLength), not the full underlying buffer.

Node.js Buffer JSON shape is also accepted and normalized:
{"type":"Buffer","data":[0..255]} -> encoded as type "Uint8Array".

3.9 ArrayBuffer
{"__@json.arraybuffer__": {"bytes": "0x..."}}
Same hex format as TypedArray bytes.

3.10 Function (UNSAFE only)
{"__@json.function__": "<source>"}
The source is the function's string representation. Consumers MAY refuse to
revive functions unless explicitly running in UNSAFE mode.

4. Decoding Rules
   Consumers MUST:

- Detect any tag object and reconstruct the corresponding type.
- Validate the payload structure and types, otherwise raise an error.
- For __@json.number__, reject any string other than NaN, Infinity, -Infinity.
- For __@json.typedarray__, if the "type" is unknown, decode as Uint8Array
  using the provided bytes.

5. Collision and Compatibility
   Because tag objects are plain JSON objects, a producer SHOULD avoid emitting
   regular objects that use any reserved tag key with a single-property object
   shape, to prevent accidental decoding.

6. Security Considerations

- The __@json.function__ tag can execute arbitrary code if revived. Only enable
  UNSAFE mode for trusted inputs.
- Non-finite numbers and BigInt are represented as strings; treat them as
  untrusted input and validate if used in critical logic.

7. IANA Considerations
   None.

8. Reference Implementation
   json-web3 (TypeScript) is the reference implementation of this specification.
