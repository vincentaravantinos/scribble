/**
 * The erase operation: the stroke has already been classified a scribble. Delete
 * the strokes it crosses (plus itself) via the lasso pipeline — the only undoable
 * delete path.
 *
 * Sequence: read the page → find crossed strokes (bbox prefilter → polyline
 * intersection, excluding the just-drawn stroke) → lasso the union bounding box
 * (screen coords) → over-selection guard → deleteLassoElements → release the
 * lasso. The page read happens only here (on a confirmed scribble), never during
 * normal writing.
 *
 * @format
 */

import { PluginCommAPI, PluginFileAPI, PluginManager } from 'sn-plugin-lib';
import { dlog, LASSO_PAD_PX, LOG, MAX_COLLATERAL_STROKES } from '../constants';
import { acquireBusy, releaseBusy } from './busy';
import { notify } from './notify';
import {
  Bbox,
  bboxesOverlap,
  bboxOf,
  emrBboxToAndroidRect,
  emrBboxToScreenRect,
  padRect,
  polylinesCross,
  Pt,
  readStrokePoints,
  Rect,
  unionBbox,
} from '../utils/geometry';

const TYPE_STROKE = 0;

/** Two bounding boxes are the same stroke read back (all corners within eps). */
function sameBbox(a: Bbox, b: Bbox, eps = 3): boolean {
  return (
    Math.abs(a.minX - b.minX) < eps &&
    Math.abs(a.minY - b.minY) < eps &&
    Math.abs(a.maxX - b.maxX) < eps &&
    Math.abs(a.maxY - b.maxY) < eps
  );
}

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
  let lassoOpen = false;
  let pageEls: any[] = [];
  let abortMsg: string | null = null; // shown after the overlay closes, so it's not hidden behind it
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

    // Find the pre-existing strokes the candidate actually crosses.
    const t0 = Date.now();
    const elsRes: any = await PluginFileAPI.getElements(page, filePath);
    pageEls = elsRes?.success ? (elsRes.result ?? []) : [];
    const crossed: { uuid: string; box: Bbox }[] = [];
    for (const e of pageEls) {
      if (e?.type !== TYPE_STROKE || e?.uuid === scribbleEl?.uuid) continue;
      const pts = await readStrokePoints(e);
      const box = bboxOf(pts);
      if (!box || !bboxesOverlap(box, scribbleBox)) continue; // cheap prefilter
      // Robust self-exclusion: the just-drawn stroke is ALSO in getElements,
      // often with a different uuid (uuid isn't consistent across SDK APIs), so
      // the uuid check above can miss it. Skip it by geometry — otherwise a
      // self-intersecting cursive word "crosses itself" and erases itself.
      if (sameBbox(box, scribbleBox)) continue;
      if (polylinesCross(scribblePts, pts)) crossed.push({ uuid: e.uuid, box });
    }
    dlog(`${LOG} erase: pageElements=${pageEls.length} crossed=${crossed.length} readMs=${Date.now() - t0}`);

    // Lasso the union bbox of the crossed strokes plus the scribble itself.
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
    // EMR bbox → padded integer screen rect. Padding outward keeps the scribble
    // (which defines the union box's edge) and other boundary strokes inside the
    // "fully inside" lasso — without it a tighter device lasso erases the text
    // but leaves the scribble.
    const toRect = (box: Bbox): Rect => {
      const raw =
        emrMaxX > 0 && emrMaxY > 0
          ? emrBboxToScreenRect(box, pageSize, emrMaxX, emrMaxY)
          : emrBboxToAndroidRect(box, pageSize);
      return padRect(raw, LASSO_PAD_PX, pageSize.width - 1, pageSize.height - 1);
    };

    const lr: any = await PluginCommAPI.lassoElements(toRect(region));
    if (!lr?.success) {
      dlog(`${LOG} erase: lassoElements failed ${JSON.stringify(lr?.error)}`);
      return;
    }
    // From here a lasso is open; the finally always releases it, so an abort or
    // an exception can't leave a dangling selection (which would silently
    // corrupt the host's element list across the next mutation).
    lassoOpen = true;

    const selRes: any = await PluginCommAPI.getLassoElements();
    const selected: any[] = selRes?.success ? (selRes.result ?? []) : [];
    if (selected.length === 0) {
      dlog(`${LOG} erase: lasso selected nothing — aborting`);
      return;
    }

    // Over-selection guard. uuid is NOT consistent across getElements vs
    // getLassoElements, so we can't match the selection against the crossed set
    // by identity; guard by COUNT instead. We expect ~ crossed strokes + the
    // scribble itself; abort only if the lasso pulls in many more than that.
    const over = Math.max(0, selected.length - (crossed.length + 1));
    if (over > MAX_COLLATERAL_STROKES) {
      dlog(`${LOG} erase: over=${over} > ${MAX_COLLATERAL_STROKES} — cancelling, removing scribble only`);
      abortMsg = 'Scribble would erase too much nearby content — cancelled.';
      // Don't leave the scribble scrawl on the page: release the broad selection
      // and delete just the scribble's own box. (Can't isolate the scribble via
      // a rect lasso, so this also removes anything fully under it — a far
      // smaller footprint than the union box we're refusing, and undoable.)
      try {
        await PluginCommAPI.setLassoBoxState(2);
        lassoOpen = false;
        const sr: any = await PluginCommAPI.lassoElements(toRect(scribbleBox));
        if (sr?.success) {
          lassoOpen = true;
          const ssel: any = await PluginCommAPI.getLassoElements();
          if ((ssel?.result ?? []).length > 0) await PluginCommAPI.deleteLassoElements();
        }
      } catch (e) {
        dlog(`${LOG} erase: scribble cleanup failed: ${e}`);
      }
      return;
    }

    const del: any = await PluginCommAPI.deleteLassoElements();
    dlog(`${LOG} erase: deleted=${selected.length} crossed=${crossed.length} over=${over} success=${del?.success}`);
  } catch (err) {
    console.error(`${LOG} eraseByScribble failed:`, err);
  } finally {
    // Release the lasso on every path (success, abort, or exception) before any
    // later mutation can run.
    if (lassoOpen) {
      try { await PluginCommAPI.setLassoBoxState(2); } catch (e) { dlog(`${LOG} erase: setLassoBoxState failed: ${e}`); }
    }
    for (const e of pageEls) {
      try { e?.recycle?.(); } catch { /* ignore */ }
    }
    releaseBusy();
    if (viewShown) {
      try { await PluginManager.closePluginView(); } catch (e) { dlog(`${LOG} erase: closePluginView failed: ${e}`); }
    }
    // After the overlay is gone and the lasso released, surface any user message.
    if (abortMsg) await notify(abortMsg);
  }
}
