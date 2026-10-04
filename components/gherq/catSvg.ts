/**
 * The Għerq cat from the Claude Design files ("Gherq Scene", "Gherq Tree and Cat"), split into
 * parts that animate separately. Trusted in-repo constants, rendered with dangerouslySetInnerHTML.
 *
 * Coordinates: the cat sits at the tree's foot, translate(250,172) scale(0.27). The sitting poses
 * draw in that cat space, head at translate(0,-128). The nap pose draws in its own nested <svg>
 * (NAP_BOX), head at translate(61,-88). The head is the same drawing in every pose ("head space").
 */

export const CAT_AT = { x: 250, y: 172, scale: 0.27 };

/** The nested viewport the nap drawing uses (from the design). */
export const NAP_BOX = { x: -119.05, y: -114.75, width: 226.1, height: 118.75, viewBox: "-138 -136 238 125" };
export const NAP_HEAD_AT = "translate(61 -88)";
export const SIT_HEAD_AT = "translate(0 -128)";

const FUR = "#6a5d52";
const STRIPE = "#2f2823";
const WHITE = "#fbf7ef";

export const NAP_SHADOW = `<ellipse cx="0" cy="1" rx="110" ry="6" fill="#5c3016" fill-opacity="0.16"></ellipse>`;
export const SIT_SHADOW = `<ellipse cx="0" cy="1" rx="52" ry="6" fill="#5c3016" fill-opacity="0.16"></ellipse>`;

// ---------- nap (nested svg space) ----------

const m = 'transform="matrix(1 0 0 1 15 -18)"';
const tailStripe = (d: string) => `<g clip-path="url(#kcn-ly0)"><path ${m} d="${d}" fill="none" stroke="rgb(47,40,35)" stroke-width="4" stroke-linecap="butt" stroke-opacity="0.85"></path></g>`;
const backStripe = (d: string, w: number) => `<g clip-path="url(#kcn-ly1)"><path ${m} d="${d}" fill="none" stroke="rgb(47,40,35)" stroke-width="${w}" stroke-linecap="round" stroke-opacity="0.8"></path></g>`;

/** The tail, lying along the ground behind her; its base is the right end. */
const NAP_TAIL_D = "M-71.28 -21.41L-74.7 -20.77L-78.05 -20.13L-81.31 -19.48L-84.49 -18.83L-87.59 -18.19L-90.62 -17.56L-93.58 -16.95L-96.48 -16.35L-99.32 -15.77L-102.11 -15.21L-104.86 -14.68L-107.57 -14.18L-110.25 -13.71L-112.9 -13.28L-115.54 -12.88L-118.16 -12.53L-120.78 -12.22L-123.4 -11.96L-126.02 -11.74L-128.67 -11.58L-131.33 -11.48L-134.03 -11.44L-136.76 -11.46L-139.53 -11.55L-142.36 -11.71L-145.3 -11.95L-145.3 -11.95A5 5 0 0 1 -146.7 -2.05L-146.7 -2.05L-143.69 -1.45L-140.66 -0.92L-137.67 -0.46L-134.71 -0.07L-131.77 0.24L-128.86 0.49L-125.96 0.68L-123.08 0.81L-120.21 0.88L-117.35 0.91L-114.48 0.89L-111.62 0.82L-108.75 0.71L-105.87 0.57L-102.98 0.39L-100.06 0.19L-97.13 -0.04L-94.16 -0.28L-91.16 -0.55L-88.12 -0.83L-85.03 -1.11L-81.9 -1.41L-78.71 -1.71L-75.46 -2L-72.14 -2.3L-68.72 -2.59Z";
/** Tail fur, clipped either side of x = -115 (tail space) so the tip can curl on its own. */
const tailFur = (clip: string) => `<g clip-path="url(#${clip})"><path ${m} d="${NAP_TAIL_D}" fill="${FUR}"></path></g>`;
export const NAP_TAIL_CLIPS = `<clipPath id="kcn-tail-base"><rect ${m} x="-116" y="-60" width="200" height="120"></rect></clipPath><clipPath id="kcn-tail-tip"><rect ${m} x="-170" y="-60" width="62" height="120"></rect></clipPath>`;
/** Where the tip joins the tail (nap space): x -115, on the tail's centre line, in tail space. */
export const NAP_TAIL_JOINT: [string, string] = ["-100px", "-24px"];

/** The tail, lying along the ground behind her; its base is the right end. */
export const NAP_TAIL = `${tailFur("kcn-tail-base")}${tailStripe("M-96.74 -22.26L-92.72 5.46")}${tailStripe("M-108.2 -20.73L-105.02 7.09")}`;

/** The striped tip of the tail, separate so it alone can curl (pivot at its right edge). */
export const NAP_TAIL_TIP = `${tailFur("kcn-tail-tip")}${tailStripe("M-118.22 -19.81L-116.52 8.14")}${tailStripe("M-127.26 -19.53L-127.49 8.47")}${tailStripe("M-135.71 -19.88L-138.03 8.02")}<g clip-path="url(#kcn-ly0)"><path ${m} d="M-139 -7A7 7 0 0 1 -153 -7A7 7 0 0 1 -139 -7" fill="${STRIPE}"></path></g>`;

export const NAP_BACK_PAW = `<path ${m} d="M20 -26L44 -5" fill="none" stroke="#e4dbcd" stroke-width="13" stroke-linecap="round"></path><path transform="matrix(1 0 0 1 59 -23)" d="M14.5 0A11.5 7 0 0 1 -8.5 0A11.5 7 0 0 1 14.5 0" fill="#e4dbcd"></path>`;

export const NAP_BODY = `<path ${m} d="M-78 0C-90 -28 -74 -60 -46 -60C-22 -60 -2 -52 22 -50C44 -48 58 -34 56 -14C55 -4 50 0 40 0Z" fill="${WHITE}"></path>
<g clip-path="url(#kcn-ly1)"><path ${m} d="M-100 10L-86 -14C-72 -30 -58 -34 -40 -36C-20 -38 -8 -34 6 -40C16 -44 24 -40 34 -44L40 -80L-100 -80Z" fill="${FUR}"></path></g>
${backStripe("M-84 -64Q-82.13 -53.64 -87.76 -43.29", 3.88)}${backStripe("M-70.31 -64Q-68.32 -56.2 -73.68 -48.4", 2.6)}${backStripe("M-56.94 -64Q-55.03 -52.06 -60.58 -40.11", 2.55)}${backStripe("M-41.76 -64Q-40.1 -52.78 -46.23 -41.55", 2.43)}${backStripe("M-29.26 -64Q-27.14 -53.13 -32.21 -42.26", 2.01)}${backStripe("M-16.96 -64Q-15.69 -52.23 -22.71 -40.45", 3.3)}${backStripe("M-7.74 -64Q-6.45 -55.65 -13.43 -47.3", 2.41)}${backStripe("M6.74 -64Q7.98 -54.07 0.88 -44.14", 2.38)}${backStripe("M21.64 -64Q24.05 -54.32 19.69 -44.65", 2.7)}
<g clip-path="url(#kcn-ly1)"><path ${m} d="M-2 -36Q4 -50 2 -64L9 -64Q12 -48 8 -36Z" fill="${WHITE}"></path></g>
<g clip-path="url(#kcn-ly1)"><path ${m} d="M-8 -8A36 10 0 0 1 -80 -8A36 10 0 0 1 -8 -8" fill="rgb(214,196,172)" fill-opacity="0.35"></path></g>
<path ${m} d="M3 -5A15 6 0 0 1 -27 -5A15 6 0 0 1 3 -5" fill="#e4dbcd"></path>`;

/** The front paws, stretched out in front of her face. */
export const NAP_FRONT_PAW = `<path ${m} d="M30 -26L62 -6" fill="none" stroke="${WHITE}" stroke-width="13.5" stroke-linecap="round"></path><path transform="matrix(1 0 0 1 77 -24)" d="M14.5 0A11.5 7 0 0 1 -8.5 0A11.5 7 0 0 1 14.5 0" fill="${WHITE}"></path>`;

// ---------- sitting (cat space) ----------

const sideStripe = (d: string) => `<path d="${d}" fill="none" stroke="${STRIPE}" stroke-opacity="0.8" stroke-width="2.6" stroke-linecap="round"></path>`;
export const SIT_BODY = `<path d="M-37 0C-45 -28-37 -70-23 -97C-17 -107 17 -107 23 -97C37 -70 45 -28 37 0Z" fill="${FUR}"></path><g clip-path="url(#kca-bf0)">${[
  "M-46 -78Q-40 -75 -36 -70",
  "M-46 -60Q-38.2 -57 -33 -52",
  "M-46 -42Q-38.2 -39 -33 -34",
  "M-46 -24Q-40 -21 -36 -16",
  "M46 -78Q40 -75 36 -70",
  "M46 -60Q38.2 -57 33 -52",
  "M46 -42Q38.2 -39 33 -34",
  "M46 -24Q40 -21 36 -16",
]
  .map(sideStripe)
  .join("")}<path d="M-17 -104C-23 -62-21 -22-19 0L19 0C21 -22 23 -62 17 -104Z" fill="${WHITE}"></path></g><ellipse cx="-32" cy="-5" rx="11" ry="5.5" fill="${WHITE}"></ellipse><ellipse cx="32" cy="-5" rx="11" ry="5.5" fill="${WHITE}"></ellipse>`;

const AWAKE_TAIL_D = "M44 -10C56 -2 30 -2 8 -5C-6 -6-18 -6-28 -9";
/** Awake: the tail curled round her feet along the ground; its base is the right end. */
export const AWAKE_TAIL = `<path d="${AWAKE_TAIL_D}" fill="none" stroke="${FUR}" stroke-width="11" stroke-linecap="round"></path><path d="${AWAKE_TAIL_D}" fill="none" stroke="${STRIPE}" stroke-opacity="0.85" stroke-width="11" stroke-dasharray="4 8" pathLength="120" stroke-dashoffset="-30"></path><circle cx="-30" cy="-9" r="5.6" fill="${STRIPE}"></circle>`;

const HAPPY_TAIL_D = "M28 -14C50 -24 50 -70 46 -104C45 -114 54 -118 59 -110";
/** Happy: the tail up with a hooked tip, and the little flick marks; its base is the bottom left. */
export const HAPPY_TAIL = `<path d="${HAPPY_TAIL_D}" fill="none" stroke="${FUR}" stroke-width="10" stroke-linecap="round"></path><path d="${HAPPY_TAIL_D}" fill="none" stroke="${STRIPE}" stroke-opacity="0.85" stroke-width="10" stroke-dasharray="4 8" pathLength="120" stroke-dashoffset="-30"></path>`;
export const HAPPY_FLICK_MARKS = `<path d="M64 -122l3 -6M70 -114l6 -3M56 -126l-1 -7" stroke="#6d5f45" stroke-width="2.2" stroke-linecap="round" fill="none"></path>`;

/** Front legs; drawn after the head, which they never overlap at rest (so a paw can reach the mouth). */
export const PAW_L = `<path d="M-3 -72L-14 -72L-15 -8L-2 -8Z" fill="${WHITE}"></path><ellipse cx="-9" cy="-6" rx="9" ry="6.5" fill="${WHITE}"></ellipse><path d="M-6.5 -4L-6.5 -8.5M-11.5 -4L-11.5 -8.5" stroke="#d6c4ac" stroke-width="1.2" stroke-linecap="round"></path>`;
export const PAW_R = `<path d="M3 -72L14 -72L15 -8L2 -8Z" fill="${WHITE}"></path><ellipse cx="9" cy="-6" rx="9" ry="6.5" fill="${WHITE}"></ellipse><path d="M6.5 -4L6.5 -8.5M11.5 -4L11.5 -8.5" stroke="#d6c4ac" stroke-width="1.2" stroke-linecap="round"></path>`;
export const PAW_SPLIT = `<path d="M0 -70L0 -10" stroke="#d6c4ac" stroke-width="1.4"></path>`;

// ---------- the head (head space) ----------

const ear = (x: number, flip: number) =>
  `<g transform="translate(${x} -18)"><path d="M${10 * flip} -5L${-7 * flip} -24L${-11 * flip} 5Z" fill="${FUR}"></path><path d="M${4 * flip} -4L${-6 * flip} -17L${-7 * flip} 2Z" fill="#d99a98"></path></g>`;
export const EAR_L = ear(-15, 1);
export const EAR_R = ear(15, -1);

const headStripe = (d: string) => `<path d="${d}" fill="none" stroke="${STRIPE}" stroke-width="2.2" stroke-linecap="round"></path>`;
export const HEAD = `<g fill="${FUR}"><circle cx="0" cy="-2" r="27"></circle><ellipse cx="0" cy="7" rx="30" ry="19"></ellipse></g><g clip-path="url(#kca-hc1)">${[
  "M-9.6 -27L-12 -13",
  "M-4.8 -27L-6 -13",
  "M4.8 -27L6 -13",
  "M9.6 -27L12 -13",
  "M-20 0Q-25 4 -31 3",
  "M20 0Q25 4 31 3",
]
  .map(headStripe)
  .join("")}<path d="M-1.5 -30L1.5 -30Q3 -10 6 0C22 0 32 12 26 22L-26 22C-32 12 -22 0 -6 0Q-3 -10 -1.5 -30Z" fill="${WHITE}"></path></g>`;

/** One open eye (rim and iris); the pupil and glint are separate so they can track things. */
export const eyeOpen = (x: number) => `<ellipse cx="${x}" cy="-2" rx="7.8" ry="7" fill="${STRIPE}"></ellipse><ellipse cx="${x}" cy="-2" rx="6.6" ry="5.9" fill="#c8cc55"></ellipse>`;
export const pupil = (x: number) => `<ellipse cx="${x}" cy="-2" rx="1.9" ry="5.2" fill="#1c150f"></ellipse><circle cx="${x + 2.2}" cy="-4.2" r="1.2" fill="#fffaeb"></circle>`;
const arc = (d: string, w: number) => `<path d="${d}" fill="none" stroke="${STRIPE}" stroke-width="${w}" stroke-linecap="round"></path>`;
export const EYE_CLOSED_L = arc("M-18 -3Q-11 4 -4 -3", 2.4);
export const EYE_CLOSED_R = arc("M4 -3Q11 4 18 -3", 2.4);
export const EYES_SMILE = arc("M-18 0Q-11 -9 -4 0M4 0Q11 -9 18 0", 2.6);

export const MOUTH = `<path d="M0 10L0 13M-4 15Q-2 16 0 13Q2 16 4 15" fill="none" stroke="#9a8a80" stroke-width="1.2" stroke-linecap="round"></path>`;
export const MOUTH_HAPPY = `<path d="M-4 13Q-2 18 0 13Q2 18 4 13" fill="#e9a0a0" stroke="#9a8a80" stroke-width="1"></path>`;
const whisker = (d: string) => `<path d="${d}" fill="none" stroke="#968a7e" stroke-opacity="0.85" stroke-width="0.9"></path>`;
export const NOSE_WHISKERS = `<path d="M-4 6L4 6L0 10.5Z" fill="#6b4a42"></path><circle cx="0" cy="9" r="1.3" fill="#e9a0a0"></circle>${[
  "M-9 9.6Q-22 6 -34 4.5",
  "M-9 12Q-22 10 -34 11",
  "M-9 14.4Q-22 14 -34 17.5",
  "M9 9.6Q22 6 34 4.5",
  "M9 12Q22 10 34 11",
  "M9 14.4Q22 14 34 17.5",
]
  .map(whisker)
  .join("")}`;
export const COLLAR = `<path d="M-21 21Q0 31 21 21L20 27Q0 37-20 27Z" fill="#7b46b0"></path><path d="M-19 22.5Q0 32 19 22.5L19 24Q0 33.5-19 24Z" fill="#a57ad6"></path>`;
export const BELL = `<circle cx="2" cy="36.5" r="3.6" fill="#d8a33f"></circle><circle cx="1.2" cy="35.7" r="1.2" fill="#e8c983"></circle>`;
/** A glint of light on the bell (the purr). */
export const BELL_GLINT = `<path d="M4.5 33.2l0 -3M3 31.7l3 0" stroke="#fffaeb" stroke-width="1.1" stroke-linecap="round"></path>`;

/** A single carob leaflet, for the falling leaf (scene space, centred on 0,0). */
export const LEAF = `<ellipse cx="0" cy="0" rx="7.5" ry="4.2" fill="#4f7a3a"></ellipse><path d="M-6 0L6 0" stroke="#34522a" stroke-width="0.8"></path>`;
