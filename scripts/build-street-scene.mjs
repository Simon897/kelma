// Cuts the home page's felt street scene (components/StreetScene.tsx) out of the source art in
// data/source/street-scene/, and measures the points the animation needs.
//
//   node scripts/build-street-scene.mjs
//
// Sources (made in ChatGPT, transparent backgrounds except the street):
//   street.webp     the street, 2000×750 (8:3), no cat, no sky decorations
//   daisy.webp      Daisy lying down, looking at the viewer
//   neighbour.webp  the neighbour (bust) and her forearm with the watering can
//   sky.webp        the sun and three clouds
//   bunting.webp    five pennants: red, cream, green, ochre, blue
//   washing.webp    a shirt, a tea towel, a t-shirt and shorts, with pegs
//
// Writes public/media/scene/*.webp and components/street-scene-geometry.json. Desktop positions are
// in the 1920×720 artboard (the street scaled by 0.96); the phone plate is a 1080×1080 crop around
// the door, so the door sits where it always has.
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const SRC = "data/source/street-scene/";
const OUT = "public/media/scene/";
mkdirSync(OUT, { recursive: true });

const SW = 2000;
const SH = 750;
/** street px -> desktop artboard */
const DK = 0.96;
/** the phone crop, in street px: x from MX, y from MY (above the street, so sky is added), MS wide */
const MS = 953;
const MX = 523.5;
const MY = SH - MS;
/** street px -> phone artboard */
const MK = 1080 / MS;
/** on phones the distant tower and dome move right, so the bell tower is in the crop */
const FAR_SHIFT_M = 60;
const PAVEMENT = 671;

const desk = (x, y) => [r2(x * DK), r2(y * DK)];
const mob = (x, y) => [r2((x - MX) * MK), r2((y - MY) * MK)];
const r2 = (n) => Math.round(n * 100) / 100;

const raw = async (file) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height };
};
const save = (buf, w, h, file, opts = {}) =>
  sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100, ...opts })
    .toFile(OUT + file);
/** A soft edge on a 0/1 mask, so cut-outs aren't jagged. */
const feather = async (mask, w, h, sigma = 0.6) => {
  const b = await sharp(Buffer.from(mask.map((v) => v * 255)), { raw: { width: w, height: h, channels: 1 } })
    .blur(sigma)
    .extractChannel(0)
    .raw()
    .toBuffer();
  return b;
};

/* ---------------- the street: sky, far, street and near layers ---------------- */

const st = await raw(SRC + "street.webp");
const P = (x, y) => {
  const i = (y * SW + x) * 4;
  return [st.data[i], st.data[i + 1], st.data[i + 2]];
};
const isSky = ([r, g, b]) => r >= 232 && g >= 148 && g <= 182 && b >= 100 && b <= 140;
const isWall = ([r, g, b]) => g >= 196 && b >= 140;
const firstRun = (x, test, n = 5) => {
  for (let y = 0; y < SH - n; y++) {
    let ok = true;
    for (let k = 0; k < n && ok; k++) ok = test(P(x, y + k));
    if (ok) return y;
  }
  return SH;
};
const nonSky = [];
const wallTop = [];
for (let x = 0; x < SW; x++) {
  nonSky.push(firstRun(x, (p) => !isSky(p)));
  wallTop.push(firstRun(x, isWall));
}
// The roofline is five flat-topped buildings; each top is the median of its columns, less the
// pale edge row the colour test misses.
const BUILDINGS = [
  [0, 357],
  [358, 704],
  [705, 1231],
  [1232, 1637],
  [1638, SW - 1],
];
const roof = new Array(SW);
for (const [a, b] of BUILDINGS) {
  const v = wallTop.slice(a, b + 1).sort((p, q) => p - q);
  const top = v[v.length >> 1] - 1;
  for (let x = a; x <= b; x++) roof[x] = top;
}
// Distant things (domes, tower, far roofs) stand above the roofline. Thin runs are shadows.
const hasFar = nonSky.map((y, x) => y < roof[x] - 3);
for (let x = 0; x < SW; ) {
  if (!hasFar[x]) {
    x++;
    continue;
  }
  let e = x;
  while (e < SW && hasFar[e]) e++;
  if (e - x < 12) for (let k = x; k < e; k++) hasFar[k] = false;
  x = e;
}
// A building's shadow on the sky goes with the building.
const streetTop = roof.map((t, x) => (hasFar[x] ? t : Math.min(t, nonSky[x])));
const skyCut = streetTop.map((t, x) => (hasFar[x] ? nonSky[x] : t));

const SKY_FLAT = (() => {
  const t = [0, 0, 0];
  for (let x = 0; x < SW; x += 7) for (let y = 4; y < 44; y += 3) P(x, y).forEach((v, i) => (t[i] += v));
  const n = Math.ceil(SW / 7) * Math.ceil(40 / 3);
  return t.map((v) => Math.round(v / n));
})();
const layer = () => Buffer.alloc(SW * SH * 4);
const put = (buf, x, y, [r, g, b], a = 255) => {
  const i = (y * SW + x) * 4;
  buf[i] = r;
  buf[i + 1] = g;
  buf[i + 2] = b;
  buf[i + 3] = a;
};
const sky = layer(); // textured all the way down (the phone plate moves the dome, so more shows)
const skyDesk = layer();
const far = layer();
const street = layer();
const near = layer();
const farMask = new Uint8Array(SW * SH);
const streetMask = new Uint8Array(SW * SH);
// Transparent pixels keep the street's own colours: left black, lossy WebP smears the black into
// the soft edges as a dark outline.
for (const buf of [far, street, near])
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) put(buf, x, y, P(x, y), 0);
for (let x = 0; x < SW; x++) {
  const c = skyCut[x];
  const ft = streetTop[x];
  for (let y = 0; y < SH; y++) {
    // sky: the real sky above, and below it the clean sky from the top of the picture, repeated
    // (only slivers ever show, when the layers in front move)
    // deep behind the buildings, where nothing can show, plain sky colour (much smaller to download)
    const sy = y < c - 14 ? y : 6 + (y % 40);
    put(sky, x, y, P(x, sy));
    put(skyDesk, x, y, y > c + 24 ? SKY_FLAT : P(x, sy));
    if (hasFar[x] && y >= nonSky[x] && y < ft + 14) {
      put(far, x, y, P(x, y < ft ? y : Math.max(0, ft - 2 - ((y - ft) % 6))));
      farMask[y * SW + x] = 1;
    }
    if (y >= ft) {
      put(street, x, y, P(x, y));
      streetMask[y * SW + x] = 1;
    }
    if (y >= PAVEMENT) put(near, x, y, P(x, y));
  }
}
const setAlpha = async (buf, mask) => {
  const a = await feather(mask, SW, SH);
  for (let i = 0; i < SW * SH; i++) buf[i * 4 + 3] = a[i];
};
await setAlpha(far, farMask);
await setAlpha(street, streetMask);
await save(skyDesk, SW, SH, "street-1-sky.webp", { quality: 86 });
await save(far, SW, SH, "street-2-far.webp");
await save(street, SW, SH, "street-3-street.webp", { quality: 88 });
await save(near, SW, SH, "street-4-near.webp");

// The phone plate: one image, the far layer moved right, sky added above by mirroring.
{
  const W = SW;
  const H = SH - MY;
  const big = Buffer.alloc(W * H * 4);
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      const sy = y - (H - SH); // street row
      const i = (y * W + x) * 4;
      const from = (buf, xx, yy) => {
        const j = (yy * SW + xx) * 4;
        return [buf[j], buf[j + 1], buf[j + 2], buf[j + 3]];
      };
      let px = from(sky, x, sy >= 0 ? sy : Math.min(SH - 1, -sy));
      const blend = (q) => {
        const a = q[3] / 255;
        px = [px[0] * (1 - a) + q[0] * a, px[1] * (1 - a) + q[1] * a, px[2] * (1 - a) + q[2] * a, 255];
      };
      const fx = x - FAR_SHIFT_M;
      if (sy >= 0 && fx >= 0) blend(from(far, fx, sy));
      if (sy >= 0) blend(from(street, x, sy));
      if (sy >= 0) blend(from(near, x, sy));
      big[i] = px[0];
      big[i + 1] = px[1];
      big[i + 2] = px[2];
      big[i + 3] = 255;
    }
  await sharp(big, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: Math.round(MX), top: 0, width: MS, height: MS })
    .resize(1080, 1080)
    .removeAlpha()
    .webp({ quality: 86 })
    .toFile(OUT + "street-mobile.webp");
}

/* ---------------- the neighbour's window: shutters and pot ---------------- */

const WIN = { x0: 1310, x1: 1392, mid: 1351, y0: 465, y1: 593 };
const POT = { x0: 1318, x1: 1384, y0: 528, y1: 620 };
const isPot = ([r, g, b]) => (r > 170 && g < 135 && r - g > 80 && b < 90) || (g > r + 5 && g > 80);
const potMask = (x, y) => x >= POT.x0 && x < POT.x1 && y >= POT.y0 && y < POT.y1 && isPot(P(x, y));
// close the small gaps inside the plant (its darker felt edges) without growing it outwards,
// so none of the shutter behind comes with it
const potIn = new Uint8Array(SW * SH);
{
  const grown = new Uint8Array(SW * SH);
  const near = (m, x, y, test) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (test(m, x + dx, y + dy)) return true;
    return false;
  };
  for (let y = POT.y0; y < POT.y1; y++) for (let x = POT.x0; x < POT.x1; x++) grown[y * SW + x] = near(null, x, y, (_, a, b) => potMask(a, b)) ? 1 : 0;
  for (let y = POT.y0; y < POT.y1; y++)
    for (let x = POT.x0; x < POT.x1; x++) potIn[y * SW + x] = near(grown, x, y, (m, a, b) => !m[b * SW + a]) ? 0 : 1;
}
// The louvres repeat down the shutter: find the period, then fill the pot's place from above.
const lum = (x, y) => P(x, y).reduce((a, b) => a + b, 0);
let period = 9;
{
  let best = Infinity;
  for (let p = 6; p <= 14; p++) {
    let d = 0;
    for (let x = WIN.x0 + 4; x < WIN.x1 - 4; x += 3) for (let y = WIN.y0 + 4; y < 525; y++) d += Math.abs(lum(x, y) - lum(x, y + p));
    if (d < best) {
      best = d;
      period = p;
    }
  }
}
const shutter = async (x0, x1, file) => {
  const w = x1 - x0;
  const h = WIN.y1 - WIN.y0;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const X = x0 + x;
      let Y = WIN.y0 + y;
      while (potIn[Y * SW + X] && Y - period > WIN.y0) Y -= period;
      const [r, g, b] = P(X, Y);
      buf.set([r, g, b, 255], (y * w + x) * 4);
    }
  await save(buf, w, h, file);
  return { x0, y0: WIN.y0, w, h };
};
const leafL = await shutter(WIN.x0, WIN.mid, "street-shutter-l.webp");
const leafR = await shutter(WIN.mid, WIN.x1, "street-shutter-r.webp");
{
  const w = POT.x1 - POT.x0;
  const h = POT.y1 - POT.y0;
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = potIn[(POT.y0 + y) * SW + POT.x0 + x];
  const a = await feather(m, w, h, 0.5);
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) buf.set([...P(POT.x0 + x, POT.y0 + y), a[y * w + x]], (y * w + x) * 4);
  await save(buf, w, h, "street-pot.webp");
}

/* ---------------- Daisy: the body, her ears and the tip of her tail ---------------- */

const dz = await raw(SRC + "daisy.webp");
const DZ = 0.3; // the cut-outs are saved at 0.3 of the source size: Daisy is at most ~300px wide on screen
let dBottom = 0;
for (let y = dz.H - 1; y >= 0 && !dBottom; y--) for (let x = 0; x < dz.W; x++) if (dz.data[(y * dz.W + x) * 4 + 3] > 128) dBottom = y;
const dpx = (x, y) => {
  const i = (y * dz.W + x) * 4;
  return [dz.data[i], dz.data[i + 1], dz.data[i + 2], dz.data[i + 3]];
};
/** which side of the line o→i a point is on (the ear is where this is `sign`) */
const side = (o, i, x, y) => ((i[0] - o[0]) * (y - o[1]) - (i[1] - o[1]) * (x - o[0])) / Math.hypot(i[0] - o[0], i[1] - o[1]);
const EARS = {
  L: { o: [900, 250], i: [1098, 168], sign: -1, box: [860, 0, 1104, 262] },
  R: { o: [1478, 270], i: [1285, 165], sign: 1, box: [1278, 0, 1530, 282] },
};
const OVERLAP = 14; // the ear reaches this far into the head, so turning it never opens a gap
const tipBox = [470, 795, 750, 980];
const isTip = ([r, g, b, a]) => a > 100 && r < 100 && g < 85 && b < 75;
const body = Buffer.from(dz.data);
const parts = {};
for (const [k, e] of Object.entries(EARS)) {
  const [x0, y0, x1, y1] = e.box;
  const w = x1 - x0;
  const h = y1 - y0;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const s = side(e.o, e.i, x, y) * e.sign;
      const p = dpx(x, y);
      if (s > 0) body[(y * dz.W + x) * 4 + 3] = 0;
      const a = s > 0 ? p[3] : s > -OVERLAP ? Math.min(p[3], Math.round(255 * Math.min(1, (s + OVERLAP) / 3))) : 0;
      buf.set([p[0], p[1], p[2], a], ((y - y0) * w + (x - x0)) * 4);
    }
  parts[`ear${k}`] = { buf, x0, y0, w, h, piv: [(e.o[0] + e.i[0]) / 2, (e.o[1] + e.i[1]) / 2] };
}
{
  const [x0, y0, x1, y1] = tipBox;
  const w = x1 - x0;
  const h = y1 - y0;
  const m = new Uint8Array(w * h);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[(y - y0) * w + (x - x0)] = isTip(dpx(x, y)) ? 1 : 0;
  const a = await feather(m, w, h, 0.8);
  const buf = Buffer.alloc(w * h * 4);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const k = (y - y0) * w + (x - x0);
      const p = dpx(x, y);
      buf.set([p[0], p[1], p[2], a[k]], k * 4);
      if (m[k]) body[(y * dz.W + x) * 4 + 3] = 0;
    }
  // pivot: the middle of the tip's root, where it joins the grey of the tail
  parts.tail = { buf, x0, y0, w, h, piv: [496, 888] };
}
// eyes: the yellow discs
const eye = (xa, xb) => {
  let x0 = 1e9,
    x1 = -1,
    y0 = 1e9,
    y1 = -1;
  for (let y = 200; y < 500; y++)
    for (let x = xa; x < xb; x++) {
      const [r, g, b] = dpx(x, y);
      if (r > 200 && g > 200 && b < 170) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  return { c: [(x0 + x1) / 2, (y0 + y1) / 2], r: Math.max(x1 - x0, y1 - y0) / 2 };
};
const eyeL = eye(950, 1190);
const eyeR = eye(1190, 1430);
// the fur the eyelids are cut from
let fur = [0, 0, 0];
{
  let n = 0;
  for (let y = 300; y < 330; y++)
    for (let x = 925; x < 960; x++) {
      const p = dpx(x, y);
      fur = fur.map((v, i) => v + p[i]);
      n++;
    }
  fur = fur.map((v) => Math.round(v / n));
}
const savePart = async (buf, w, h, file) => {
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .resize(Math.round(w * DZ), Math.round(h * DZ))
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(OUT + file);
};
await savePart(body, dz.W, dz.H, "daisy.webp");
for (const k of ["earL", "earR", "tail"]) await savePart(parts[k].buf, parts[k].w, parts[k].h, `daisy-${k === "tail" ? "tail" : k === "earL" ? "ear-l" : "ear-r"}.webp`);

/* ---------------- the sheets: neighbour, sky, bunting, washing ---------------- */

/** crops a piece from a sheet, trims it and saves it `width` px wide (optionally mirrored) */
const piece = async (sheet, [x0, y0, x1, y1], file, width, { flop = false, extendBottom = 0 } = {}) => {
  const { data } = await sharp(SRC + sheet)
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .png()
    .toBuffer({ resolveWithObject: true });
  const t = await sharp(data).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  let s = sharp(t.data);
  if (flop) s = s.flop();
  if (extendBottom) s = sharp(await s.extend({ bottom: Math.round(t.info.height * extendBottom), extendWith: "mirror" }).png().toBuffer());
  const out = await s.resize({ width }).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT + file);
  return { w: t.info.width, h: t.info.height, ratio: out.height / out.width, left: x0 - t.info.trimOffsetLeft, top: y0 - t.info.trimOffsetTop };
};
const pieces = {
  // her dress continues below the picture's edge, so the window frame can crop her anywhere
  nanna: await piece("neighbour.webp", [200, 0, 900, 806], "neighbour.webp", 240, { extendBottom: 0.3 }),
  arm: await piece("neighbour.webp", [1000, 300, 1800, 806], "neighbour-can.webp", 280, { flop: true }),
  sun: await piece("sky.webp", [0, 0, 660, 668], "sun.webp", 300),
  cloud1: await piece("sky.webp", [660, 0, 1330, 316], "cloud-1.webp", 420),
  cloud2: await piece("sky.webp", [1360, 0, 2000, 316], "cloud-2.webp", 420),
  cloud3: await piece("sky.webp", [700, 316, 1830, 668], "cloud-3.webp", 520),
};
for (let i = 0; i < 5; i++) pieces[`flag${i}`] = await piece("bunting.webp", [[20, 420, 800, 1190, 1580][i], 100, [420, 800, 1190, 1580, 1990][i], 600], `flag-${i + 1}.webp`, 120);
const WASH = [
  [20, 60, 610, 610],
  [610, 60, 1050, 610],
  [1050, 60, 1495, 610],
  [1495, 60, 1990, 610],
];
for (let i = 0; i < 4; i++) pieces[`wash${i}`] = await piece("washing.webp", WASH[i], `wash-${i + 1}.webp`, 160);
// the sun's middle, cut round, so it can pulse while the rays turn
{
  const s = pieces.sun;
  const { data, info } = await sharp(SRC + "sky.webp").extract({ left: s.left, top: s.top, width: s.w, height: s.h }).raw().toBuffer({ resolveWithObject: true });
  const cx = s.w / 2;
  const cy = s.h / 2;
  const R = 0.315 * s.w;
  const w = Math.ceil(R * 2) + 4;
  const buf = Buffer.alloc(w * w * 4);
  for (let y = 0; y < w; y++)
    for (let x = 0; x < w; x++) {
      const X = Math.round(cx - w / 2 + x);
      const Y = Math.round(cy - w / 2 + y);
      const d = Math.hypot(X - cx, Y - cy);
      if (X < 0 || Y < 0 || X >= info.width || Y >= info.height) continue;
      const i = (Y * info.width + X) * info.channels;
      const a = Math.max(0, Math.min(1, R - d + 0.5));
      buf.set([data[i], data[i + 1], data[i + 2], Math.round(data[i + 3] * a)], (y * w + x) * 4);
    }
  await sharp(buf, { raw: { width: w, height: w, channels: 4 } })
    .resize(Math.round((w * 300) / s.w))
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(OUT + "sun-core.webp");
  pieces.sunCore = { frac: w / s.w };
}

/* ---------------- geometry ---------------- */

// Daisy on the doorstep, in street px: her paws on the step, her head in front of the door.
const DAISY_W = 198;
const dk = DAISY_W / dz.W;
const dx0 = 1052 - 1190 * dk;
const dy0 = 654 - dBottom * dk;
const dpt = (x, y) => [dx0 + x * dk, dy0 + y * dk];

const geo = {};
for (const [fmt, map, k] of [
  ["desktop", desk, DK],
  ["mobile", mob, MK],
]) {
  const box = (x, y, w, h) => {
    const [X, Y] = map(x, y);
    return [X, Y, r2(w * k), r2(h * k)];
  };
  const dpart = (p) => {
    const [x, y] = dpt(p.x0, p.y0);
    const [px, py] = map(...dpt(...p.piv));
    return [...box(x, y, p.w * dk, p.h * dk), px, py];
  };
  const [lx, ly] = map(...[1173, 258]);
  const glass = [
    [1159, 244],
    [1187, 244],
    [1183, 272],
    [1163, 272],
  ]
    .map(([x, y]) => map(x, y).join(","))
    .join(" ");
  const bell = fmt === "desktop" ? [...map(505.5, 110), 1] : [...map(505.5 + FAR_SHIFT_M, 110), r2(MK / DK)];
  geo[fmt] = {
    daisy: box(dx0, dy0, dz.W * dk, dz.H * dk),
    earL: dpart(parts.earL),
    earR: dpart(parts.earR),
    tail: dpart(parts.tail),
    eyeL: map(...dpt(...eyeL.c)),
    eyeR: map(...dpt(...eyeR.c)),
    eyeRad: r2(((eyeL.r + eyeR.r) / 2) * dk * k),
    leafL: box(leafL.x0, leafL.y0, leafL.w, leafL.h),
    leafR: box(leafR.x0, leafR.y0, leafR.w, leafR.h),
    pot: box(POT.x0, POT.y0, POT.x1 - POT.x0, POT.y1 - POT.y0),
    win: [...map(WIN.x0, WIN.y0), r2(((WIN.x1 - WIN.x0) * k) / 76), r2(((WIN.y1 - WIN.y0) * k) / 119)],
    lamp: [lx, ly, fmt === "desktop" ? 1 : r2(MK / DK)],
    glass,
    bell,
  };
}
geo.fur = `rgb(${fur.join(",")})`;
geo.pieces = Object.fromEntries(Object.entries(pieces).map(([k, v]) => [k, v.ratio ? r2(v.ratio) : v.frac]));
writeFileSync("components/street-scene-geometry.json", JSON.stringify(geo, null, 1) + "\n");
console.log(JSON.stringify({ roof: BUILDINGS.map(([a]) => roof[a]), period, eyeL, eyeR, dBottom, tail: parts.tail.piv, ...geo }, null, 1));
