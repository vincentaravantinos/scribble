/**
 * Scribble classification from a stroke's own points. Cheap (no SDK read of
 * other elements) — only a stroke that classifies as a scribble triggers the
 * page read in the erase step.
 *
 * @format
 */

import { REVERSAL_DEADBAND_FRAC, SCRIBBLE_THRESHOLDS } from '../constants';
import { bboxOf, diagonalOf, Pt, reversalCountsByAxis } from '../utils/geometry';

export interface ScribbleClass {
  isScribble: boolean;
  reversals: number; // max over the two principal axes
  major: number;
  minor: number;
  diagonal: number;
}

export function classifyScribble(pts: Pt[]): ScribbleClass {
  const axes = reversalCountsByAxis(pts, REVERSAL_DEADBAND_FRAC);
  const strong = Math.max(axes.major, axes.minor);
  const both = Math.min(axes.major, axes.minor);
  const box = bboxOf(pts);
  const diagonal = box ? diagonalOf(box) : 0;
  // Vigorous on one axis OR moderate on both — handwriting (incl. cursive) is
  // neither. See SCRIBBLE_THRESHOLDS.
  const oscillates =
    strong >= SCRIBBLE_THRESHOLDS.STRONG_AXIS_REVERSALS ||
    both >= SCRIBBLE_THRESHOLDS.BOTH_AXES_REVERSALS;
  const isScribble =
    oscillates && diagonal > 0 && diagonal <= SCRIBBLE_THRESHOLDS.MAX_BBOX_DIAGONAL;
  return { isScribble, reversals: strong, major: axes.major, minor: axes.minor, diagonal };
}
