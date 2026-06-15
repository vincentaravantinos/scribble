# Changes

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
