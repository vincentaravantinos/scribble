import { PluginCommAPI, PluginManager } from 'sn-plugin-lib';
import { BUILD_TAG, dlog, LOG } from './constants';
import { summarizeElements } from './utils/diagnostics';
import { acquireBusy, releaseBusy } from './logic/busy';

export async function handleMainAction() {
  if (!acquireBusy()) {
    // Share the single-flight guard with any gesture-driven live updates, so a
    // tap while a prior op is still in flight is rejected. Tell the user, so a
    // swallowed tap doesn't look like a broken button.
    dlog(`${LOG} handleMainAction already running — ignoring re-entrant button press`);
    alert('Still busy — please wait a moment.');
    return;
  }
  // Watchdog: if an SDK call truly hangs, the finally never runs and the guard
  // would wedge the button forever. Release it after a timeout. Must exceed any
  // legitimately-slow op, else firing it mid-op re-opens the re-entrancy window.
  const WATCHDOG_MS = 60000;
  const watchdog = setTimeout(() => {
    console.error(`${LOG} handleMainAction watchdog fired (operation hung >${WATCHDOG_MS / 1000}s) — releasing re-entrancy guard`);
    releaseBusy();
  }, WATCHDOG_MS);
  let viewShown = false; // busy overlay shown for this action?
  try {
    const filePathRes: any = await PluginCommAPI.getCurrentFilePath();
    const pageRes: any = await PluginCommAPI.getCurrentPageNum();
    if (!filePathRes?.success || typeof filePathRes.result !== 'string') {
      alert('Unable to determine current file path.');
      return;
    }
    if (!pageRes?.success || typeof pageRes.result !== 'number') {
      alert('Unable to determine current page.');
      return;
    }
    const filePath = filePathRes.result as string;
    const page = pageRes.result as number;

    const elementsRes: any = await PluginCommAPI.getLassoElements();
    const elements: any[] = elementsRes?.success ? (elementsRes.result ?? []) : [];
    if (elements.length === 0) {
      alert('Please make a selection first.');
      return;
    }

    // Busy overlay: the SDK has no non-blocking busy primitive (every native
    // dialog is a blocking modal), so we render the plugin's own React view (a
    // small "working" card, see App.tsx) via showPluginView and hide it in the
    // finally. Shown AFTER the selection is read, so showing the view can't eat
    // the lasso the operation still depends on.
    try {
      await PluginManager.showPluginView();
      viewShown = true;
    } catch (e) {
      dlog(`${LOG} showPluginView failed: ${e}`);
    }

    try {
      dlog(`${LOG} ACTION BEGIN page=${page} build=${BUILD_TAG} elements: ${summarizeElements(elements)}`);
      // TODO: dispatch to the plugin's actual logic based on `elements`,
      // `filePath`, `page`.
    } finally {
      for (const el of elements) {
        try { el.recycle?.(); } catch { /* ignore */ }
      }
    }
  } catch (error) {
    console.error(`${LOG} Plugin action failed:`, error);
    alert('An error occurred during processing.');
  } finally {
    clearTimeout(watchdog);
    releaseBusy();
    if (viewShown) {
      try {
        await PluginManager.closePluginView();
      } catch (e) {
        dlog(`${LOG} closePluginView failed: ${e}`);
      }
    }
  }
}
