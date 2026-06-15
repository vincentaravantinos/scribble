/**
 * Scribble classification from a stroke's own points. Cheap (no SDK read of
 * other elements) — only a stroke that classifies as a scribble triggers the
 * page read in the erase step.
 *
 * @format
 */

import { REVERSAL_DEADBAND_FRAC, SCRIBBLE_THRESHOLDS } from '../constants';
import { bboxOf, diagonalOf, Pt, reversalCount } from '../utils/geometry';

export interface ScribbleClass {
  isScribble: boolean;
  reversals: number;
  diagonal: number;
}

export function classifyScribble(pts: Pt[]): ScribbleClass {
  const reversals = reversalCount(pts, REVERSAL_DEADBAND_FRAC);
  const box = bboxOf(pts);
  const diagonal = box ? diagonalOf(box) : 0;
  const isScribble =
    reversals >= SCRIBBLE_THRESHOLDS.MIN_REVERSALS &&
    diagonal > 0 &&
    diagonal <= SCRIBBLE_THRESHOLDS.MAX_BBOX_DIAGONAL;
  return { isScribble, reversals, diagonal };
}
