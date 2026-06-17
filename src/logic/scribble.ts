/**
 * PEN_UP entry point. A stroke triggers an erase only if it (a) looks scribbly
 * enough to be worth checking (cheap shape pre-filter, no page read) and (b)
 * actually crosses existing ink (the overlap gate, in eraseByScribble). A
 * scribbly stroke on blank space is just writing/drawing and is left alone.
 *
 * The lib mutates the payload elements in place via transformElements, so each
 * carries a uuid-keyed points accessor.
 *
 * @format
 */

import { PluginCommAPI, NativePluginManager } from 'sn-plugin-lib';
import { BUILD_TAG, dlog, LOG } from '../constants';
import { readStrokePoints } from '../utils/geometry';
import { classifyScribble } from './detect';
import { eraseByScribble } from './erase';

const TYPE_STROKE = 0;

export async function onScribblePenUp(elements: any[]): Promise<void> {
  try {
    if (!Array.isArray(elements) || elements.length === 0) return;

    for (const el of elements) {
      if (el?.type !== TYPE_STROKE) continue;

      const pts = await readStrokePoints(el);
      const cls = classifyScribble(pts);
      const tag = typeof el?.uuid === 'string' ? el.uuid.slice(0, 8) : '????????';
      dlog(
        `${LOG} STROKE ${tag} build=${BUILD_TAG} conc=${cls.conc.toFixed(2)} ` +
          `rev=${cls.rev} diag=${cls.diagonal.toFixed(0)} ` +
          `-> ${cls.isScribble ? 'SCRIBBLE' : 'normal'}`,
      );
      if (!cls.isScribble) continue;

      // Landscape (split-page) mode is not supported: the host's lasso pipeline
      // misbehaves there — lassoElements can hang and never return, freezing the
      // plugin. Skip the erase rather than risk that. getOrientation returns 1/3
      // for the 90°/270° landscape orientations (0/2 are portrait).
      let orientation = 0;
      try {
        const o = await (NativePluginManager as any).getOrientation();
        if (typeof o === 'number') orientation = o;
      } catch { /* assume portrait if unavailable */ }
      if (orientation === 1 || orientation === 3) {
        dlog(`${LOG} STROKE ${tag} landscape (orientation=${orientation}) — erase unsupported, skipping`);
        alert('Scribble erase isn’t available in landscape mode yet.');
        continue;
      }

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
