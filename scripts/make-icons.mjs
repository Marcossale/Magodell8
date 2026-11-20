// Genera icons/icon-192.png e icon-512.png: sfondo blu con un "8" bianco (due anelli sovrapposti).
import fs from 'fs';
import zlib from 'zlib';

function png(S) {
  const raw = Buffer.alloc(S * (S * 4 + 1));
  const rings = [[0.5, 0.36, 0.17], [0.5, 0.64, 0.2]].map(([x, y, r]) => [x * S, y * S, r * S]);
  const t = S * 0.055;
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      let a = 0;
      for (const [cx, cy, r] of rings) a = Math.max(a, Math.min(1, Math.max(0, t / 2 + 0.5 - Math.abs(Math.hypot(x + .5 - cx, y + .5 - cy) - r))));
      const k = 0.15 * (y / S);                       // leggero sfumato verso il basso
      const bg = [42 * (1 - k) | 0, 91 * (1 - k) | 0, 215 * (1 - k * .4) | 0];
      const o = y * (S * 4 + 1) + 1 + x * 4;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(bg[c] * (1 - a) + 255 * a);
      raw[o + 3] = 255;
    }
  }
  const chunk = (type, data) => {
    const b = Buffer.concat([Buffer.from(type), data]);
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(b) >>> 0);
    return Buffer.concat([len, b, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

fs.mkdirSync('icons', { recursive: true });
for (const S of [192, 512]) fs.writeFileSync(`icons/icon-${S}.png`, png(S));
console.log('Icone create.');
