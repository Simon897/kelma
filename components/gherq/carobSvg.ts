/**
 * Static SVG for Għerq's scene, ported from the Claude Design file "Gherq Scene.dc.html"
 * (viewBox 0 0 360 236). Only the drawn root-letter tiles were left out: the game shows the
 * site's own stone root tiles (RootTiles) over the soil instead. Everything here is decorative.
 */

export const VIEWBOX = "0 0 360 236";
export const SCENE_BG = "#f2e2c4";

export const DEFS = `
<filter id="gq-sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1.2" dy="1.8" stdDeviation="0.6" flood-color="#2e2618" flood-opacity="0.32"></feDropShadow></filter>
<filter id="gq-sh2" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="2" dy="2.6" stdDeviation="1" flood-color="#2e2618" flood-opacity="0.3"></feDropShadow></filter>
<pattern id="gq-wall" width="64" height="26" patternUnits="userSpaceOnUse">
<rect width="64" height="26" fill="#a38f68"></rect>
<g fill="#c7b38a"><polygon points="2,3 19,2 22,12 4,13"></polygon><polygon points="24,2 41,3 43,13 23,13"></polygon><polygon points="45,3 63,2 64,13 45,13"></polygon><polygon points="1,15 11,14 13,26 1,26"></polygon><polygon points="14,15 33,14 34,26 15,26"></polygon><polygon points="36,14 53,15 53,26 36,26"></polygon><polygon points="55,15 64,14 64,26 56,26"></polygon></g>
<g fill="#e4d6b4"><polygon points="1,2 18,1 21,11 3,12"></polygon><polygon points="23,1 40,2 42,12 22,12"></polygon><polygon points="44,2 62,1 63,12 44,12"></polygon><polygon points="0,14 10,13 12,25 0,25"></polygon><polygon points="13,14 32,13 33,25 14,25"></polygon><polygon points="35,13 52,14 52,25 35,25"></polygon></g>
<g fill="#efe6ce"><polygon points="23,1 40,2 42,12 22,12"></polygon><polygon points="54,14 63,13 63,25 55,25"></polygon></g>
</pattern>
<g id="gq-sprig">
<path d="M0,0 Q2,-16 0,-34" stroke="#34522a" stroke-width="1.6" fill="none"></path>
<ellipse cx="-7" cy="-9" rx="7.5" ry="4.2" fill="#4f7a3a" transform="rotate(-28 -7 -9)"></ellipse>
<ellipse cx="7" cy="-12" rx="7.5" ry="4.2" fill="#3f6a32" transform="rotate(28 7 -12)"></ellipse>
<ellipse cx="-7" cy="-21" rx="7" ry="4" fill="#3f6a32" transform="rotate(-28 -7 -21)"></ellipse>
<ellipse cx="7" cy="-24" rx="7" ry="4" fill="#5d8a44" transform="rotate(28 7 -24)"></ellipse>
<ellipse cx="0" cy="-36" rx="4.2" ry="7" fill="#5d8a44"></ellipse>
</g>
<g id="gq-pod">
<path d="M0,0 L0,4" stroke="#5b3f27" stroke-width="1.6"></path>
<path d="M-1,4 C5,9 7,22 4,34 C3,38 -2,38 -2,34 C0,24 -2,12 -4,6 Z" fill="#c9921e" stroke="#7d5810" stroke-width="1"></path>
<ellipse cx="1" cy="13" rx="1.4" ry="2" fill="#e6b84c"></ellipse><ellipse cx="2" cy="21" rx="1.4" ry="2" fill="#e6b84c"></ellipse><ellipse cx="1.5" cy="29" rx="1.3" ry="1.9" fill="#e6b84c"></ellipse>
</g>
<clipPath id="kca-bf0"><path d="M-37 0C-45 -28-37 -70-23 -97C-17 -107 17 -107 23 -97C37 -70 45 -28 37 0Z"></path></clipPath><clipPath id="kca-hc1"><circle cx="0" cy="-2" r="27"></circle><ellipse cx="0" cy="7" rx="30" ry="19"></ellipse></clipPath><clipPath id="kch-bf0"><path d="M-37 0C-45 -28-37 -70-23 -97C-17 -107 17 -107 23 -97C37 -70 45 -28 37 0Z"></path></clipPath><clipPath id="kch-hc1"><circle cx="0" cy="-2" r="27"></circle><ellipse cx="0" cy="7" rx="30" ry="19"></ellipse></clipPath><clipPath id="kcn-ly0" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 15 -18)" d="M-71.28 -21.41L-74.7 -20.77L-78.05 -20.13L-81.31 -19.48L-84.49 -18.83L-87.59 -18.19L-90.62 -17.56L-93.58 -16.95L-96.48 -16.35L-99.32 -15.77L-102.11 -15.21L-104.86 -14.68L-107.57 -14.18L-110.25 -13.71L-112.9 -13.28L-115.54 -12.88L-118.16 -12.53L-120.78 -12.22L-123.4 -11.96L-126.02 -11.74L-128.67 -11.58L-131.33 -11.48L-134.03 -11.44L-136.76 -11.46L-139.53 -11.55L-142.36 -11.71L-145.3 -11.95L-145.3 -11.95A5 5 0 0 1 -146.7 -2.05L-146.7 -2.05L-143.69 -1.45L-140.66 -0.92L-137.67 -0.46L-134.71 -0.07L-131.77 0.24L-128.86 0.49L-125.96 0.68L-123.08 0.81L-120.21 0.88L-117.35 0.91L-114.48 0.89L-111.62 0.82L-108.75 0.71L-105.87 0.57L-102.98 0.39L-100.06 0.19L-97.13 -0.04L-94.16 -0.28L-91.16 -0.55L-88.12 -0.83L-85.03 -1.11L-81.9 -1.41L-78.71 -1.71L-75.46 -2L-72.14 -2.3L-68.72 -2.59Z"></path></clipPath><clipPath id="kcn-ly1" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 15 -18)" d="M-78 0C-90 -28 -74 -60 -46 -60C-22 -60 -2 -52 22 -50C44 -48 58 -34 56 -14C55 -4 50 0 40 0Z"></path></clipPath><clipPath id="kcn-ly2" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 61 -88)" d="M27 -2A27 27 0 0 1 -27 -2A27 27 0 0 1 27 -2M30 7L30 7A30 19 0 0 1 -30 7A30 19 0 0 1 30 7"></path></clipPath><clipPath id="kcn-ly3" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 61 -88)" d="M-4.4 -2A6.6 5.9 0 0 1 -17.6 -2A6.6 5.9 0 0 1 -4.4 -2"></path></clipPath><clipPath id="kcn-ly4" clipPathUnits="userSpaceOnUse"><path transform="matrix(1 0 0 1 61 -88)" d="M17.6 -2A6.6 5.9 0 0 1 4.4 -2A6.6 5.9 0 0 1 17.6 -2"></path></clipPath>
`;

/** Sky, hills, rubble wall, field and soil, plus the pale roots running down to the root tiles. */
export const GROUND = `
<rect x="-600" y="-200" width="1560" height="440" fill="#f2e2c4"></rect>
<path d="M-600,118 L-600,96 C-300,86 -120,104 40,94 C140,88 230,102 330,92 C460,84 700,100 960,92 L960,118 Z" fill="#e3cfa6" filter="url(#gq-sh)"></path>
<rect x="-600" y="114" width="1560" height="28" fill="url(#gq-wall)" filter="url(#gq-sh2)"></rect>
<path d="M-600,140 L960,140 L960,240 L-600,240 Z" fill="#9aa35a"></path>
<path d="M-600,150 C-200,147 0,156 180,152 C400,148 700,156 960,150" stroke="#879049" stroke-width="2" fill="none"></path>
<path d="M-600,161 C-200,158 0,166 180,163 C400,159 700,166 960,161" stroke="#879049" stroke-width="2" fill="none"></path>
<path d="M-600,176 C-300,170 -60,178 120,172 C220,169 300,177 420,172 C620,166 800,176 960,172 L960,400 L-600,400 Z" fill="#7b5a3b" filter="url(#gq-sh2)"></path>
<path d="M-600,214 C-300,208 0,218 180,212 C400,206 700,216 960,210 L960,400 L-600,400 Z" fill="#6a4b30"></path>
<g fill="#8f6c49"><ellipse cx="60" cy="188" rx="5" ry="2.5"></ellipse><ellipse cx="300" cy="196" rx="6" ry="3"></ellipse><ellipse cx="-40" cy="200" rx="4" ry="2"></ellipse><ellipse cx="420" cy="186" rx="5" ry="2.5"></ellipse><ellipse cx="96" cy="222" rx="4" ry="2"></ellipse><ellipse cx="270" cy="226" rx="5" ry="2.4"></ellipse></g>
<g stroke="#c9a877" stroke-width="3" fill="none" stroke-linecap="round">
<path d="M176,176 C170,184 150,184 139,194"></path><path d="M180,176 L180,194"></path><path d="M184,176 C190,184 210,184 221,194"></path>
</g>
<g stroke="#b08f5e" stroke-width="1.3" fill="none" stroke-linecap="round">
<path d="M160,183 C150,180 140,186 128,184"></path><path d="M200,183 C212,180 222,188 236,186"></path><path d="M172,180 C168,188 162,190 160,198"></path>
</g>
`;

/** The carob trunk, branches and buds (the tree starts bare). */
export const TREE = `
<g filter="url(#gq-sh2)">
<path d="M168,176 C171,152 173,136 170,121 C164,110 150,99 132,90 L136,83 C152,90 165,98 172,105 C170,90 161,71 150,53 L156,49 C168,67 176,85 178,100 C180,81 180,61 178,40 L184,40 C186,62 186,82 184,100 C190,84 200,67 212,49 L218,53 C206,71 196,88 190,104 C198,97 214,89 232,85 L234,91 C216,95 201,105 191,118 C188,136 190,152 195,176 Z" fill="#5b3f27"></path>
<g stroke="#5b3f27" stroke-width="3.6" stroke-linecap="round" fill="none"><path d="M134,87 C120,90 108,92 98,96"></path><path d="M153,51 C150,46 146,42 141,40"></path><path d="M215,51 C218,46 222,42 227,40"></path><path d="M233,88 C244,87 254,87 262,90"></path><path d="M181,41 L180,28"></path><path d="M166,83 C153,77 140,76 128,78"></path><path d="M200,82 C212,76 224,72 238,71"></path></g>
</g>
<g fill="#7a9a4a"><circle cx="98" cy="96" r="2"></circle><circle cx="141" cy="40" r="2"></circle><circle cx="227" cy="40" r="2"></circle><circle cx="262" cy="90" r="2"></circle><circle cx="180" cy="28" r="2"></circle><circle cx="128" cy="78" r="2"></circle><circle cx="238" cy="71" r="2"></circle></g>
`;

/**
 * Where found words grow, in fill order: the first sprig of each branch group, then the second,
 * then the two small sprigs by the pods. [x, y, rotate, scale] in the scene's viewBox.
 */
export const SPRIG_SLOTS: [number, number, number, number][] = [
  [180, 30, -4, 1.35], [150, 52, -24, 1.3], [216, 52, 24, 1.3], [168, 70, -22, 1.2],
  [100, 95, -74, 1.3], [260, 90, 74, 1.3], [128, 78, -48, 1.25], [238, 71, 48, 1.25],
  [181, 46, 40, 1], [146, 46, -62, 1], [222, 44, 62, 1], [193, 70, 22, 1.2],
  [112, 92, -30, 1.05], [248, 88, 30, 1.05], [140, 77, -8, 1], [224, 73, 8, 1],
  [226, 86, 110, 0.8], [132, 86, -110, 0.8], [156, 64, -40, 1], [206, 64, 40, 1],
];

/** Where golden pods hang (rare words); further rare words hang a pod at the next sprig slot. */
export const POD_SLOTS: [number, number, number, number][] = [
  [222, 88, -8, 1], [126, 84, 8, 1], [230, 87, 10, 0.85], [118, 88, -10, 0.85],
];
