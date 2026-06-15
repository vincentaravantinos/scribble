export const LOG = '[Scribble]';

// Gates the diagnostic logs. Errors (`console.error`) and user-facing `alert`s
// are never gated. Flip on while developing.
export const DEBUG = false;
export function dlog(...args: any[]): void {
  if (DEBUG) console.log(...args);
}

// Logged at each action start to confirm which build is actually live: pushing a
// new .snplg doesn't always replace the running one. Bump per deploy.
export const BUILD_TAG = 'v0.1.0';

// Scribble detection thresholds, calibrated against a labeled corpus.
export const SCRIBBLE_THRESHOLDS = {
  // Minimum number of oscillations along either principal axis (see
  // countReversals). THE discriminating feature: normal handwriting topped out
  // at 8 reversals while scribbles ran 8–22, so a bar of 10 gave zero false
  // positives and caught most scribbles. The margin to dense cursive is thin —
  // this is the knob to revisit if false positives appear.
  MIN_REVERSALS: 10,
  // Loose backstop only. A large single sweep is already rejected by the
  // reversal gate (a straight sweep has ~0 reversals).
  MAX_BBOX_DIAGONAL: 12000,
};

// Reversal counting ignores oscillations smaller than this fraction of the
// projected span, so dense-sample jitter doesn't inflate the count.
export const REVERSAL_DEADBAND_FRAC = 0.1;

// Over-selection guard for the erase. The lasso (rect, fully-inside) can pull in
// untouched strokes that sit fully within the crossed strokes' bounding box. If
// the lasso selects more than this many strokes beyond the set we actually
// detected as crossed (+ the scribble itself), the erase aborts instead of
// mass-deleting. Such collateral would be undoable, but this caps the blast
// radius of a pathological scribble (e.g. one crossing two far-apart strokes).
export const MAX_COLLATERAL_STROKES = 3;

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
