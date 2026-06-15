/**
 * The erase operation: given a stroke already classified as a scribble, delete
 * the strokes it crosses (plus itself) via the lasso pipeline — the only
 * undoable delete path.
 *
 * Sequence: read the page → find crossed strokes (bbox prefilter → polyline
 * intersection) → lasso the union bounding box (in screen coords) → guard
 * against over-selection → deleteLassoElements → release the lasso.
 *
 * @format
 */

import { PluginCommAPI, PluginFileAPI, PluginManager } from 'sn-plugin-lib';
import { dlog, LOG, MAX_COLLATERAL_STROKES } from '../constants';
import { acquireBusy, releaseBusy } from './busy';
import {
  Bbox,
  bboxesOverlap,
  bboxOf,
  emrBboxToAndroidRect,
  emrBboxToScreenRect,
  polylinesCross,
  Pt,
  readStrokePoints,
  unionBbox,
} from '../utils/geometry';

const TYPE_STROKE = 0;

export async function eraseByScribble(
  scribbleEl: any,
  scribblePts: Pt[],
  filePath: string,
  page: number,
): Promise<void> {
  // Shared single-flight guard: a second scribble while one erase is in flight
  // would interleave lasso state and writes. Whoever holds it runs; others back off.
  if (!acquireBusy()) {
    dlog(`${LOG} erase: busy — ignoring`);
    return;
  }
  let viewShown = false;
  let pageEls: any[] = [];
  try {
    // Non-blocking "Working…" overlay; the page read can take seconds on a dense
    // page (getElements marshals every element).
    try {
      await PluginManager.showPluginView();
      viewShown = true;
    } catch (e) {
      dlog(`${LOG} erase: showPluginView failed: ${e}`);
    }

    const scribbleBox = bboxOf(scribblePts);
    if (!scribbleBox) {
      dlog(`${LOG} erase: scribble has no bbox`);
      return;
    }

    // Find the strokes the scribble actually crosses.
    const elsRes: any = await PluginFileAPI.getElements(page, filePath);
    pageEls = elsRes?.success ? (elsRes.result ?? []) : [];
    const crossed: { uuid: string; box: Bbox }[] = [];
    for (const e of pageEls) {
      if (e?.type !== TYPE_STROKE || e?.uuid === scribbleEl?.uuid) continue;
      const pts = await readStrokePoints(e);
      const box = bboxOf(pts);
      if (!box || !bboxesOverlap(box, scribbleBox)) continue; // cheap prefilter
      if (polylinesCross(scribblePts, pts)) crossed.push({ uuid: e.uuid, box });
    }
    dlog(`${LOG} erase: pageElements=${pageEls.length} crossed=${crossed.length}`);

    // Lasso the union bbox of the crossed strokes plus the scribble itself, so
    // the scribble is always erased even if it crossed nothing.
    const region = unionBbox([scribbleBox, ...crossed.map(c => c.box)]);
    if (!region) return;
    const psRes: any = await PluginFileAPI.getPageSize(filePath, page);
    const pageSize: any = psRes?.success ? psRes.result : null;
    if (!pageSize || typeof pageSize.width !== 'number' || typeof pageSize.height !== 'number') {
      dlog(`${LOG} erase: getPageSize failed (${JSON.stringify(psRes)})`);
      return;
    }
    // EMR→screen. PointUtils.emrPoint2Android scales by the pageSize-derived EMR
    // max, which is wrong when the device's true EMR range differs from it
    // (the element's maxX/maxY carries the real page max). Scale by maxX/maxY
    // when available; fall back to the library converter otherwise.
    const emrMaxX = typeof scribbleEl?.maxX === 'number' ? scribbleEl.maxX : 0;
    const emrMaxY = typeof scribbleEl?.maxY === 'number' ? scribbleEl.maxY : 0;
    const rect =
      emrMaxX > 0 && emrMaxY > 0
        ? emrBboxToScreenRect(region, pageSize, emrMaxX, emrMaxY)
        : emrBboxToAndroidRect(region, pageSize);

    const lr: any = await PluginCommAPI.lassoElements(rect);
    if (!lr?.success) {
      dlog(`${LOG} erase: lassoElements failed ${JSON.stringify(lr?.error)}`);
      return;
    }
    const selRes: any = await PluginCommAPI.getLassoElements();
    const selected: any[] = selRes?.success ? (selRes.result ?? []) : [];
    if (selected.length === 0) {
      dlog(`${LOG} erase: lasso selected nothing — aborting`);
      await PluginCommAPI.setLassoBoxState(2);
      return;
    }

    // Over-selection guard. uuid is NOT consistent across getElements vs
    // getLassoElements, so we can't match the selection against the crossed set
    // by identity; guard by COUNT instead. We expect ~ crossed strokes + the
    // scribble itself; abort only if the lasso pulls in many more than that.
    const over = Math.max(0, selected.length - (crossed.length + 1));
    if (over > MAX_COLLATERAL_STROKES) {
      dlog(`${LOG} erase: over=${over} > ${MAX_COLLATERAL_STROKES} — aborting`);
      await PluginCommAPI.setLassoBoxState(2);
      alert('Scribble would erase too much nearby content — cancelled.');
      return;
    }

    const del: any = await PluginCommAPI.deleteLassoElements();
    dlog(`${LOG} erase: deleted=${selected.length} crossed=${crossed.length} over=${over} success=${del?.success}`);
    await PluginCommAPI.setLassoBoxState(2);
  } catch (err) {
    console.error(`${LOG} eraseByScribble failed:`, err);
  } finally {
    for (const e of pageEls) {
      try { e?.recycle?.(); } catch { /* ignore */ }
    }
    releaseBusy();
    if (viewShown) {
      try { await PluginManager.closePluginView(); } catch (e) { dlog(`${LOG} erase: closePluginView failed: ${e}`); }
    }
  }
}
