export const LOG = '[Scribble]';

// Gates the diagnostic logs. Errors (`console.error`) and user-facing `alert`s
// are never gated. Flip on while developing.
export const DEBUG = false;
export function dlog(...args: any[]): void {
  if (DEBUG) console.log(...args);
}

// Logged at each action start to confirm which build is actually live: pushing a
// new .snplg doesn't always replace the running one. Bump per deploy.
export const BUILD_TAG = 'v1.1.3';

// Scribble detection: a scribble is a single CONSISTENT back-and-forth.
// - MIN_CONCENTRATION: how aligned the stroke's segments are to one axis (0–1).
//   A scribble's segments all lie along one direction → high; handwriting goes
//   many directions → low. Labeled corpus: scribbles 0.96–0.98, words ≤ 0.77.
// - MIN_REVERSALS: it must actually oscillate along that axis (excludes a single
//   consistent straight stroke, which is also high-concentration).
// - MAX_BBOX_DIAGONAL: loose size backstop.
export const SCRIBBLE_THRESHOLDS = {
  MIN_CONCENTRATION: 0.85,
  MIN_REVERSALS: 5,
  MAX_BBOX_DIAGONAL: 12000,
};

// Reversal counting ignores oscillations smaller than this fraction of the
// projected span, so dense-sample jitter doesn't inflate the count.
export const REVERSAL_DEADBAND_FRAC = 0.1;

// The erase lassoes the union bbox of the crossed strokes + the scribble. The
// scribble defines that box's outer edge, so with the lasso's "fully inside"
// selection it sits right on the boundary — and a slightly tighter device lasso
// (higher-DPI screens buy less margin from integer rounding) drops it, so the
// text erases but the scribble doesn't. Pad the rect outward by this many screen
// px so boundary strokes are comfortably inside.
export const LASSO_PAD_PX = 8;

// Gates PluginFileAPI.getElements/getPageSize (direct file reads, even on the
// currently-open file). The lasso-delete pipeline (PluginCommAPI) needs no
// permission of its own — see SDK_DOC.md.
export const PERM_FILE_READ = 'plugin.permission.FILE:READ';

// SDK element type codes (from getElements / getLassoElements).
export const ELEMENT_TYPES = {
  STROKE: 0,
  TITLE: 100,
  PICTURE: 200,
  TEXT: 500,
  TEXT_DIGEST_QUOTE: 501,
  TEXT_DIGEST_CREATE: 502,
  LINK: 600,
  GEO: 700,
};
