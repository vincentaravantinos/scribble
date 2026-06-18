# Changes

## v1.1.1 — 2026-06-18

- **Erase now works on dense pages.** The over-selection guard was too eager — a
  multi-stroke word reads as "collateral" because a scribble only geometrically
  crosses some of its strokes — so a normal erase on a crowded page could cancel
  and delete nothing. Relaxed the guard so ordinary erases go through; it still
  cancels a genuinely run-away scribble.
- **Cancelled erases no longer leave the scribble behind.** If an erase does
  cancel, the scribble mark itself is removed, so the page isn't left scrawled.
- **Cancel / landscape notices are now visible.** These messages were silently
  dropped before (the dialog wasn't wired up correctly in the host).
- **Fewer missed strokes on higher-resolution devices.** Padded the selection so
  the scribble and edge strokes aren't dropped by a tighter lasso (e.g. on the
  Manta / A5X2), which previously erased the text but left the scribble.

## v1.1.0 — 2026-06-17

- **Reliable scribble detection — no more cursive false positives.** Detection
  now keys on *direction consistency*: a scribble is a single back-and-forth
  zig-zag (segments along one axis), while handwriting — including dense cursive —
  goes many directions. Calibrated on a corpus of real strokes (0 false positives,
  0 false negatives). It's instant (no page read while writing) and works at any
  angle. Only zig-zags are recognized — a single strikethrough or an X/cross is
  intentionally not treated as an erase.
- **Landscape: erase is skipped (not supported yet).** In landscape the device
  shows a split half-page and the host's lasso pipeline misbehaves there (it can
  hang), so a scribble in landscape shows a brief notice and does nothing instead
  of risking a freeze. Erase works in portrait. (Tracked for a future release.)

## v1.0.1 — 2026-06-15

- **Fewer false positives on cursive.** Retuned detection so cursive handwriting
  is much less likely to be read as a scribble, while keeping ordinary
  scribbles — one-directional or area-filling — reliably detected.

## v1.0.0 — 2026-06-15

- **Erase-by-scribble.** Draw a tight back-and-forth scribble over handwriting
  and the crossed strokes — plus the scribble itself — are deleted. No button, no
  lasso: it reacts to the drawing gesture (PEN_UP). The delete goes through the
  host lasso pipeline, so it is **undoable**. A guard cancels the erase (rather
  than mass-deleting) if it would take in far more than the strokes crossed.
  Detection is by reversal count (a stroke that oscillates ≥10 times), computed
  from the stroke's own points — normal handwriting doesn't trigger it.
- **User manual** in the README, with a demo GIF.

## v0.1.0 — 2026-06-15

- Initial cut of erase-by-scribble (superseded by 1.0.0).
