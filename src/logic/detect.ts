/**
 * Scribble classification from the stroke's own points (cheap, no SDK read of
 * other elements). A scribble is a single CONSISTENT back-and-forth: its segments
 * point along one axis (`conc` high) and it reverses along that axis several times
 * (`rev`). Handwriting — even zig-zaggy cursive — goes many directions (`conc`
 * low). Validated on a labeled corpus: scribbles conc 0.96–0.98, words ≤ 0.77.
 *
 * @format
 */

import { REVERSAL_DEADBAND_FRAC, SCRIBBLE_THRESHOLDS } from '../constants';
import { bboxOf, diagonalOf, Pt, sweepMetrics } from '../utils/geometry';

export interface ScribbleClass {
  isScribble: boolean;
  conc: number;
  rev: number;
  diagonal: number;
}

export function classifyScribble(pts: Pt[]): ScribbleClass {
  const sm = sweepMetrics(pts, REVERSAL_DEADBAND_FRAC);
  const box = bboxOf(pts);
  const diagonal = box ? diagonalOf(box) : 0;
  const isScribble =
    sm.conc >= SCRIBBLE_THRESHOLDS.MIN_CONCENTRATION &&
    sm.rev >= SCRIBBLE_THRESHOLDS.MIN_REVERSALS &&
    diagonal > 0 &&
    diagonal <= SCRIBBLE_THRESHOLDS.MAX_BBOX_DIAGONAL;
  return { isScribble, conc: sm.conc, rev: sm.rev, diagonal };
}
