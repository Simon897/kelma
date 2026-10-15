// A minimal reader for mongodump .bson files (the Ġabra dump): yields each top-level document.
// Handles the types the dump uses; binary values are skipped.
import { closeSync, openSync, readSync } from "node:fs";

function readDoc(b, start) {
  const end = start + b.readInt32LE(start);
  let o = start + 4;
  const doc = {};
  while (o < end - 1) {
    const type = b[o++];
    let k = o;
    while (b[k]) k++;
    const name = b.toString("utf8", o, k);
    o = k + 1;
    let v;
    switch (type) {
      case 0x01:
        v = b.readDoubleLE(o);
        o += 8;
        break;
      case 0x02: {
        const n = b.readInt32LE(o);
        v = b.toString("utf8", o + 4, o + 4 + n - 1);
        o += 4 + n;
        break;
      }
      case 0x03:
      case 0x04: {
        const n = b.readInt32LE(o);
        v = readDoc(b, o);
        if (type === 0x04) v = Object.values(v);
        o += n;
        break;
      }
      case 0x05:
        o += 5 + b.readInt32LE(o);
        v = null;
        break;
      case 0x07:
        v = b.toString("hex", o, o + 12);
        o += 12;
        break;
      case 0x08:
        v = b[o] === 1;
        o += 1;
        break;
      case 0x09:
      case 0x11:
      case 0x12:
        v = Number(b.readBigInt64LE(o));
        o += 8;
        break;
      case 0x0a:
        v = null;
        break;
      case 0x10:
        v = b.readInt32LE(o);
        o += 4;
        break;
      default:
        throw new Error(`Unsupported BSON type 0x${type.toString(16)} in field "${name}"`);
    }
    doc[name] = v;
  }
  return doc;
}

export function* bsonDocs(path) {
  const fd = openSync(path, "r");
  const head = Buffer.alloc(4);
  let buf = Buffer.alloc(1 << 20);
  let pos = 0;
  try {
    while (readSync(fd, head, 0, 4, pos) === 4) {
      const n = head.readInt32LE(0);
      if (n > buf.length) buf = Buffer.alloc(n * 2);
      readSync(fd, buf, 0, n, pos);
      yield readDoc(buf, 0);
      pos += n;
    }
  } finally {
    closeSync(fd);
  }
}
