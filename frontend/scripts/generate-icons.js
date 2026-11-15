/**
 * generate-icons.js — renders the app's icon set as real files.
 *
 * The repo ships no icon assets, so /favicon.ico, /logo192.png and
 * /logo512.png 404 and the PWA can't install with proper icons. This script
 * rasterizes a simple branded glyph (indigo rounded square + white shopping
 * cart silhouette) into:
 *
 *   public/logo192.png   (192x192)
 *   public/logo512.png   (512x512)
 *   public/favicon.ico   (32x32 PNG-in-ICO, supported by all modern browsers)
 *
 * No dependencies — uses zlib's deflate for PNG encoding.
 *
 * Usage: node scripts/generate-icons.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BG = [99, 102, 241, 255];    // #6366f1 indigo (theme_color)
const FG = [255, 255, 255, 255];   // white glyph

// ---------------------------------------------------------------- cart art

// Rasterize a cart silhouette in normalized [0,1] space.
// Returns true when pixel (u,v) is inside the cart glyph.
function inCart(u, v) {
  // Handle: short bar from (0.22,0.26) to (0.32,0.30)
  if (v >= 0.26 && v <= 0.31 && u >= 0.20 && u <= 0.30) return true;
  // Handle stem joining basket
  if (u >= 0.28 && u <= 0.34 && v >= 0.28 && v <= 0.38) return true;

  // Basket: trapezoid, top y=0.38 -> bottom y=0.60
  if (v >= 0.38 && v <= 0.60) {
    const t = (v - 0.38) / 0.22;              // 0 top -> 1 bottom
    const left = 0.30 + 0.07 * t;             // tapers inward
    const right = 0.78 - 0.07 * t;
    // Hollow: outline thickness ~0.045, plus a horizontal bar mid-way
    const wall = 0.045;
    const insideOutline =
      (u >= left && u <= left + wall) ||
      (u >= right - wall && u <= right) ||
      (v <= 0.38 + wall) ||                    // top rim
      (v >= 0.60 - wall && u >= left && u <= right); // bottom rim
    const midBar = v >= 0.47 && v <= 0.47 + wall && u >= left && u <= right;
    if (u >= left && u <= right && (insideOutline || midBar)) return true;
  }

  // Wheels: two circles centered (0.42,0.70) and (0.66,0.70), r=0.05
  for (const cx of [0.42, 0.66]) {
    const dx = u - cx, dy = v - 0.70;
    if (dx * dx + dy * dy <= 0.05 * 0.05) return true;
  }
  return false;
}

function renderIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const radius = size * 0.22;                 // rounded-corner radius
  const glyphPad = size * 0.12;               // glyph inset

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;

      // Rounded-rect background (maskable-safe full bleed)
      const cx = Math.min(Math.max(x, radius), size - 1 - radius);
      const cy = Math.min(Math.max(y, radius), size - 1 - radius);
      const dx = x - cx, dy = y - cy;
      const inside = dx * dx + dy * dy <= radius * radius;
      if (!inside) { px[i + 3] = 0; continue; } // transparent corner

      // Glyph space mapped into the padded box
      const u = (x - glyphPad) / (size - glyphPad * 2);
      const vv = (y - glyphPad) / (size - glyphPad * 2);
      const glyph = u >= 0 && u <= 1 && vv >= 0 && vv <= 1 && inCart(u, vv);

      const c = glyph ? FG : BG;
      px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = c[3];
    }
  }
  return px;
}

// -------------------------------------------------------------- PNG encode

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type RGBA

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter: none
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------- ICO encode

// ICO embedding PNG (Vista+ / all modern browsers)
function encodeIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: icon
  header.writeUInt16LE(1, 4);      // count

  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size;  // width (0 = 256)
  entry[1] = size >= 256 ? 0 : size;  // height
  entry[2] = 0;                       // palette
  entry[3] = 0;                       // reserved
  entry.writeUInt16LE(1, 4);          // planes
  entry.writeUInt16LE(32, 6);         // bit depth
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(6 + 16, 12);    // data offset

  return Buffer.concat([header, entry, pngBuffer]);
}

// -------------------------------------------------------------------- main

const targets = [
  { file: 'logo192.png', size: 192 },
  { file: 'logo512.png', size: 512 },
];

for (const { file, size } of targets) {
  const png = encodePng(size, renderIcon(size));
  fs.writeFileSync(path.join(PUBLIC_DIR, file), png);
  console.log(`wrote ${file} (${png.length} bytes)`);
}

const favPng = encodePng(32, renderIcon(32));
fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), encodeIco(favPng, 32));
console.log(`wrote favicon.ico (${favPng.length + 22} bytes)`);
