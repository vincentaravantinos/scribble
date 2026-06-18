/**
 * User-facing messages. React Native's bare `alert()` is not wired up in the
 * Supernote plugin host (it silently no-ops), so route through the host's own
 * native dialog instead. Blocking modal; failures are swallowed (a message that
 * can't show must never break the operation).
 *
 * @format
 */

import { NativeUIUtils } from 'sn-plugin-lib';
import { dlog, LOG } from '../constants';

export async function notify(message: string): Promise<void> {
  try {
    await (NativeUIUtils as any).showRattaDialog(message, 'OK', '', false);
  } catch (e) {
    dlog(`${LOG} notify failed: ${e}`);
  }
}
