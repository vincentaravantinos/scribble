export const LOG = '[Scribble]';

// Gates the diagnostic logs. Errors (`console.error`) and user-facing `alert`s
// are never gated. Flip on while developing.
export const DEBUG = false;
export function dlog(...args: any[]): void {
  if (DEBUG) console.log(...args);
}

// Logged at each action start to confirm which build is actually live: pushing a
// new .snplg doesn't always replace the running one. Bump per deploy.
export const BUILD_TAG = 'v1.0.1';

// Scribble detection thresholds, calibrated against a labeled corpus. A stroke
// is a scribble if EITHER condition holds (reversals are counted per PCA axis):
//   - the stronger axis oscillates a lot (STRONG_AXIS) — a vigorous scribble, or
//   - both axes oscillate a fair amount (BOTH_AXES) — an area-filling scrub.
// Cursive sits in the one corner that fails both: in the corpus a full cursive
// phrase reached max 12 / min 9, while every erase-scribble cleared one bar or
// the other (max 13–24, or min 10–22). Margins are thin (cursive is 1 below each
// bar); these are the knobs to revisit, and undo is the backstop.
export const SCRIBBLE_THRESHOLDS = {
  STRONG_AXIS_REVERSALS: 13,
  BOTH_AXES_REVERSALS: 10,
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
