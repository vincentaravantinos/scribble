/**
 * PEN_UP entry point. Classifies each just-drawn stroke from its own points
 * (cheap, no page read); if it's a scribble, erases the strokes it crosses.
 *
 * The lib mutates the payload elements in place via transformElements, so each
 * carries a uuid-keyed points accessor.
 *
 * @format
 */

import { PluginCommAPI } from 'sn-plugin-lib';
import { BUILD_TAG, dlog, LOG } from '../constants';
import { readStrokePoints } from '../utils/geometry';
import { classifyScribble } from './detect';
import { eraseByScribble } from './erase';

const TYPE_STROKE = 0;

export async function onScribblePenUp(elements: any[]): Promise<void> {
  try {
    if (!Array.isArray(elements) || elements.length === 0) return;

    for (const el of elements) {
      if (el?.type !== TYPE_STROKE) continue; // only strokes can be scribbles

      const pts = await readStrokePoints(el);
      const cls = classifyScribble(pts);
      const tag = typeof el?.uuid === 'string' ? el.uuid.slice(0, 8) : '????????';
      dlog(
        `${LOG} STROKE ${tag} build=${BUILD_TAG} reversals=${cls.reversals} ` +
          `diag=${cls.diagonal.toFixed(0)} -> ${cls.isScribble ? 'SCRIBBLE' : 'normal'}`,
      );
      if (!cls.isScribble) continue;

      const pathRes: any = await PluginCommAPI.getCurrentFilePath();
      const pageRes: any = await PluginCommAPI.getCurrentPageNum();
      const filePath: string | null =
        pathRes?.success && typeof pathRes.result === 'string' ? pathRes.result : null;
      const page: number | null =
        pageRes?.success && typeof pageRes.result === 'number' ? pageRes.result : null;
      if (filePath == null || page == null) {
        dlog(`${LOG} STROKE ${tag} missing file/page (path=${filePath} page=${page})`);
        continue;
      }

      await eraseByScribble(el, pts, filePath, page);
    }
  } catch (error) {
    console.error(`${LOG} onScribblePenUp failed:`, error);
  } finally {
    for (const el of elements ?? []) {
      try { el?.recycle?.(); } catch { /* ignore */ }
    }
  }
}
