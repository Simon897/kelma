import { asset } from "@/lib/site";

/**
 * Għerq's scene (viewBox 0 0 360 236): a carob tree in a rubble-walled field, its roots running
 * into the soil. The pictures in public/gherq/ were made with an image model; this file places them.
 * The game shows the site's own stone root tiles (RootTiles) over the soil. Everything is decorative.
 */

export const VIEWBOX = "0 0 360 236";
/** The background picture's sky, which also fills the scene wherever the picture doesn't reach. */
export const SCENE_BG = "#f7e0b8";

export const DEFS = `
<filter id="gq-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1.2" dy="1.8" stdDeviation="0.6" flood-color="#2e2618" flood-opacity="0.32"></feDropShadow></filter>
<clipPath id="kca-bf0"><path d="M-37 0C-45 -28-37 -70-23 -97C-17 -107 17 -107 23 -97C37 -70 45 -28 37 0Z"></path></clipPath><clipPath id="kca-hc1"><circle cx="0" cy="-2" r="27"></circle><ellipse cx="0" cy="7" rx="30" ry="19"></ellipse></clipPath><clipPath id="kch-bf0"><path d="M-37 0C-45 -28-37 -70-23 -97C-17 -107 17 -107 23 -97C37 -70 45 -28 37 0Z"></path></clipPath><clipPath id="kch-hc1"><circle cx="0" cy="-2" r="27"></circle><ellipse cx="0" cy="7" rx="30" ry="19"></ellipse></clipPath><clipPath id="kcn-ly0" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 15 -18)" d="M-71.28 -21.41L-74.7 -20.77L-78.05 -20.13L-81.31 -19.48L-84.49 -18.83L-87.59 -18.19L-90.62 -17.56L-93.58 -16.95L-96.48 -16.35L-99.32 -15.77L-102.11 -15.21L-104.86 -14.68L-107.57 -14.18L-110.25 -13.71L-112.9 -13.28L-115.54 -12.88L-118.16 -12.53L-120.78 -12.22L-123.4 -11.96L-126.02 -11.74L-128.67 -11.58L-131.33 -11.48L-134.03 -11.44L-136.76 -11.46L-139.53 -11.55L-142.36 -11.71L-145.3 -11.95L-145.3 -11.95A5 5 0 0 1 -146.7 -2.05L-146.7 -2.05L-143.69 -1.45L-140.66 -0.92L-137.67 -0.46L-134.71 -0.07L-131.77 0.24L-128.86 0.49L-125.96 0.68L-123.08 0.81L-120.21 0.88L-117.35 0.91L-114.48 0.89L-111.62 0.82L-108.75 0.71L-105.87 0.57L-102.98 0.39L-100.06 0.19L-97.13 -0.04L-94.16 -0.28L-91.16 -0.55L-88.12 -0.83L-85.03 -1.11L-81.9 -1.41L-78.71 -1.71L-75.46 -2L-72.14 -2.3L-68.72 -2.59Z"></path></clipPath><clipPath id="kcn-ly1" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 15 -18)" d="M-78 0C-90 -28 -74 -60 -46 -60C-22 -60 -2 -52 22 -50C44 -48 58 -34 56 -14C55 -4 50 0 40 0Z"></path></clipPath><clipPath id="kcn-ly2" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 61 -88)" d="M27 -2A27 27 0 0 1 -27 -2A27 27 0 0 1 27 -2M30 7L30 7A30 19 0 0 1 -30 7A30 19 0 0 1 30 7"></path></clipPath><clipPath id="kcn-ly3" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 61 -88)" d="M-4.4 -2A6.6 5.9 0 0 1 -17.6 -2A6.6 5.9 0 0 1 -4.4 -2"></path></clipPath><clipPath id="kcn-ly4" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 61 -88)" d="M17.6 -2A6.6 5.9 0 0 1 4.4 -2A6.6 5.9 0 0 1 17.6 -2"></path></clipPath>
`;

/**
 * Sky, hills, rubble wall, field and soil: one picture, 1536×1024 px at 0.272 units a pixel, repeated
 * sideways from x -28.9 so a wide scene keeps going. Every other copy is mirrored, so the joins match. Its grass starts at y 140 and its soil at 174.
 * The strip starts 2 units below the tile's plain-sky top, so the tile below can't bleed into it.
 */
const BG = asset("/gherq/scene-bg.webp");
const BG_W = 417.8, BG_H = 278.5, BG_X = -28.9, BG_Y = -28.4;
export const GROUND = `
<defs><pattern id="gq-bg" patternUnits="userSpaceOnUse" x="${BG_X}" y="${BG_Y}" width="${2 * BG_W}" height="${BG_H}"><image href="${BG}" width="${BG_W}" height="${BG_H}" preserveAspectRatio="none"></image><image href="${BG}" width="${BG_W}" height="${BG_H}" preserveAspectRatio="none" transform="translate(${2 * BG_W},0) scale(-1,1)"></image></pattern></defs>
<rect x="-600" y="-200" width="1560" height="440" fill="${SCENE_BG}"></rect>
<rect x="-600" y="${BG_Y + 2}" width="1560" height="${BG_H - 2}" fill="url(#gq-bg)"></rect>
<rect x="-600" y="${BG_Y + BG_H - 0.5}" width="1560" height="200" fill="#6c4125"></rect>
`;

/** The bare carob, roots included: 1536×1024 px at 0.18 units a pixel, the trunk's foot at (180, 176). */
export const TREE = `
<image href="${asset("/gherq/tree.webp")}" x="43.9" y="30.2" width="276.5" height="184.3"></image>
`;

/**
 * Foliage clumps, in fill order: the crown top first, then outwards and down. The canopy fills as
 * a share of the core words found. [x, y, rotate, scale] in the scene's viewBox.
 */
export const CLUMP_SLOTS: [number, number, number, number][] = [
  [174, 40, 0, 1.1],
  [148, 50, -10, 1.05],
  [202, 50, 10, 1.05],
  [124, 62, -14, 1],
  [228, 60, 14, 1],
  [160, 62, -6, 1],
  [190, 62, 6, 1],
  [100, 78, -18, 1],
  [254, 76, 18, 1],
  [136, 76, -8, 1],
  [214, 76, 8, 1],
  [174, 78, 0, 1],
  [84, 94, -20, 0.9],
  [272, 92, 20, 0.9],
  [116, 92, -12, 0.9],
  [238, 92, 12, 0.9],
];

/** The leaf picture's size in viewBox units at scale 1, centred on the slot. */
export const CLUMP_W = 52;
export const CLUMP_H = 40.8;

/**
 * Where carob pods hang (one per bonus word); from the 5th on they cluster beside these four. The
 * lowest pod is the one the cat bats, so the first pod and the lowest ones hang on the right, nearest her.
 */
export const POD_SLOTS: [number, number, number, number][] = [
  [226, 96, -8, 1],
  [126, 94, 8, 1],
  [236, 98, 10, 0.85],
  [116, 95, -10, 0.85],
];
