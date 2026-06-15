import { LOG } from '../constants';

// Single-flight guard for the erase operation. Rapid PEN_UP scribbles could
// otherwise run two erases concurrently, interleaving lasso state and deletes
// and corrupting the note. Whoever holds the guard runs; others back off.
//
// Self-healing: a crash mid-operation never runs the `finally` that releases the
// guard, and handleMainAction's setTimeout watchdog doesn't fire while the host
// is dead/idle (JS timers need a pumped loop). So track WHEN the guard was
// acquired and let a sufficiently stale guard be reacquired regardless — this
// doesn't depend on any timer firing.
const STALE_MS = 90000; // longer than any legitimate operation

let busySince: number | null = null;

export function acquireBusy(): boolean {
  if (busySince !== null) {
    if (Date.now() - busySince < STALE_MS) return false;
    console.error(`${LOG} busy guard stale (held >${STALE_MS / 1000}s) — self-healing`);
  }
  busySince = Date.now();
  return true;
}

export function releaseBusy(): void {
  busySince = null;
}

export function isBusy(): boolean {
  return busySince !== null;
}
