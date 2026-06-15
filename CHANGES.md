# Changes

## Unreleased

- **Erase-by-scribble.** Draw a tight back-and-forth scribble over handwriting
  and the crossed strokes — plus the scribble itself — are deleted. No button, no
  lasso: it reacts to the drawing gesture (PEN_UP). The delete goes through the
  host lasso pipeline, so it is **undoable**. A guard cancels the erase (rather
  than mass-deleting) if it would take in far more than the strokes crossed.
  Detection is by reversal count (a stroke that oscillates ≥10 times), computed
  from the stroke's own points — normal handwriting doesn't trigger it.
