/**
 * Pure geometry helpers for scribble detection and erase. No SDK calls except
 * reading a stroke's points (which is inherently SDK-backed) and the EMR→screen
 * coordinate conversion. Kept side-effect-free and unit-testable.
 *
 * @format
 */

import { PointUtils } from 'sn-plugin-lib';

export interface Pt {
  x: number;
  y: number;
}

export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Reads all sample points of a stroke via its uuid-keyed accessor (2 bridge calls). */
export async function readStrokePoints(el: any): Promise<Pt[]> {
  const acc = el?.stroke?.points;
  if (!acc || typeof acc.size !== 'function') return [];
  const size: number = await acc.size();
  if (!size || size <= 0) return [];
  const raw: any[] = (await acc.getRange(0, size)) ?? [];
  return raw
    .filter(p => p && typeof p.x === 'number' && typeof p.y === 'number')
    .map(p => ({ x: p.x, y: p.y }));
}

export function bboxOf(pts: Pt[]): Bbox | null {
  if (!pts.length) return null;
  let minX = pts[0].x, maxX = pts[0].x, minY = pts[0].y, maxY = pts[0].y;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function unionBbox(boxes: (Bbox | null)[]): Bbox | null {
  const valid = boxes.filter((b): b is Bbox => b !== null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }));
}

export function bboxesOverlap(a: Bbox, b: Bbox): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function diagonalOf(b: Bbox): number {
  return Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
}

/**
 * Counts back-and-forth oscillations of a 1-D sequence, ignoring wiggles smaller
 * than `deadbandFrac` of the total span (so dense-sample jitter doesn't inflate
 * the count). Returns the number of confirmed direction changes.
 */
export function countReversals(seq: number[], deadbandFrac: number): number {
  if (seq.length < 3) return 0;
  let lo = seq[0], hi = seq[0];
  for (const v of seq) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const span = hi - lo;
  if (span <= 0) return 0;
  const db = deadbandFrac * span;

  let reversals = 0;
  let dir = 0; // 0 = undecided, +1 = rising, -1 = falling
  let pivot = seq[0]; // extreme of the current run (used once dir is set)
  let runMin = seq[0]; // running extremes during the undecided bootstrap
  let runMax = seq[0];

  for (let i = 1; i < seq.length; i++) {
    const v = seq[i];
    if (dir === 0) {
      if (v > runMax) runMax = v;
      if (v < runMin) runMin = v;
      if (runMax - v > db) {
        dir = -1;
        pivot = v;
      } else if (v - runMin > db) {
        dir = 1;
        pivot = v;
      }
    } else if (dir === 1) {
      if (v > pivot) pivot = v;
      else if (pivot - v > db) {
        reversals++;
        dir = -1;
        pivot = v;
      }
    } else {
      if (v < pivot) pivot = v;
      else if (v - pivot > db) {
        reversals++;
        dir = 1;
        pivot = v;
      }
    }
  }
  return reversals;
}

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function onSegment(a: Pt, b: Pt, c: Pt): boolean {
  return (
    Math.min(a.x, b.x) <= c.x && c.x <= Math.max(a.x, b.x) &&
    Math.min(a.y, b.y) <= c.y && c.y <= Math.max(a.y, b.y)
  );
}

/** Standard segment/segment intersection (proper or collinear-overlap). */
export function segmentsIntersect(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = orient(p3, p4, p1);
  const d2 = orient(p3, p4, p2);
  const d3 = orient(p1, p2, p3);
  const d4 = orient(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;
  return false;
}

/**
 * Sweep metrics: how consistently the stroke's segments point along ONE axis
 * (`conc`, 0–1), and the number of reversals along that axis (`rev`). A scribble
 * is a single consistent back-and-forth → high `conc`; handwriting goes many
 * directions → low `conc`. `conc` is a length-weighted circular concentration of
 * segment directions doubled (so a back-and-forth, 180° apart, reinforces).
 */
export function sweepMetrics(pts: Pt[], deadbandFrac: number): { conc: number; rev: number } {
  if (pts.length < 3) return { conc: 0, rev: 0 };
  let cx = 0, sx = 0, w = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const l = Math.hypot(dx, dy);
    if (l === 0) continue;
    const th = Math.atan2(dy, dx);
    cx += l * Math.cos(2 * th);
    sx += l * Math.sin(2 * th);
    w += l;
  }
  if (w === 0) return { conc: 0, rev: 0 };
  const conc = Math.hypot(cx, sx) / w;
  const deg = 0.5 * Math.atan2(sx, cx); // dominant sweep axis (radians)
  const ux = Math.cos(deg), uy = Math.sin(deg);
  const proj = pts.map(p => p.x * ux + p.y * uy);
  const rev = countReversals(proj, deadbandFrac);
  return { conc, rev };
}

/** True if any segment of polyline `a` intersects any segment of polyline `b`. */
export function polylinesCross(a: Pt[], b: Pt[]): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) return true;
    }
  }
  return false;
}

/**
 * Converts an EMR-space bounding box to an integer Android/screen-space rect for
 * `lassoElements`. `emrPoint2Android` rescales AND swaps/flips axes, so convert
 * all four corners and rebuild from their min/max; round outward to integers
 * (lassoElements rejects non-integers with error 107).
 */
export function emrBboxToAndroidRect(b: Bbox, pageSize: { width: number; height: number }): Rect {
  const corners: Pt[] = [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.minX, y: b.maxY },
    { x: b.maxX, y: b.maxY },
  ];
  const a = corners.map(c => PointUtils.emrPoint2Android(c, pageSize) as Pt);
  return rectFromCorners(a);
}

/**
 * EMR→screen using the page's ACTUAL EMR max (from an element's `maxX`/`maxY`),
 * not the pageSize-derived guess that `PointUtils.emrPoint2Android` uses — which
 * is wrong on devices whose EMR range doesn't match the reported pageSize.
 * Replicates the library's axis-swap transform with the correct scale.
 */
export function emrBboxToScreenRect(
  b: Bbox,
  pageSize: { width: number; height: number },
  emrMaxX: number,
  emrMaxY: number,
): Rect {
  const mtX = emrMaxX / (pageSize.height - 1);
  const mtY = emrMaxY / (pageSize.width - 1);
  const conv = (p: Pt): Pt => ({
    x: pageSize.width - 1 - p.y / mtY,
    y: p.x / mtX,
  });
  const corners: Pt[] = [
    conv({ x: b.minX, y: b.minY }),
    conv({ x: b.maxX, y: b.minY }),
    conv({ x: b.minX, y: b.maxY }),
    conv({ x: b.maxX, y: b.maxY }),
  ];
  return rectFromCorners(corners);
}

/** Expands a rect by `pad` px on every side, clamped to [0, maxX] × [0, maxY]. */
export function padRect(r: Rect, pad: number, maxX: number, maxY: number): Rect {
  return {
    left: Math.max(0, r.left - pad),
    top: Math.max(0, r.top - pad),
    right: Math.min(maxX, r.right + pad),
    bottom: Math.min(maxY, r.bottom + pad),
  };
}

function rectFromCorners(a: Pt[]): Rect {
  const xs = a.map(p => p.x);
  const ys = a.map(p => p.y);
  return {
    left: Math.floor(Math.min(...xs)),
    top: Math.floor(Math.min(...ys)),
    right: Math.ceil(Math.max(...xs)),
    bottom: Math.ceil(Math.max(...ys)),
  };
}
