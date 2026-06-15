# Scribble — Specification

This document captures the behaviour the plugin is required to provide.
Implementation details belong in the code; this file is the source of truth
for *what* the plugin does, not *how* it does it.

## Overview

Scribble lets a Supernote user erase handwriting the way they would on paper:
draw a scribble (a tight back-and-forth zigzag) over the strokes they want
gone, and those strokes — plus the scribble itself — disappear. No lasso, no
button: it reacts to the drawing gesture itself.

## Core operation

### Erase-by-scribble
**Trigger**: the user draws a stroke that the plugin classifies as a
"scribble" (see "Scribble detection" below), then lifts the pen.

**Outcome**:
- The scribble stroke itself is deleted (it never remains visible).
- Every pre-existing stroke (or text item, or link, or any element actually) that the scribble's path crosses/covers is also
  deleted.
- Content that isn't crossed by the scribble is *intended* to be untouched. In
  practice the erase is performed through the host's lasso pipeline (the only
  undoable delete path — see "Undo"), which selects strokes by rectangle. So the
  delete targets the **combined bounding box of the crossed strokes**, and an
  untouched stroke that happens to sit *fully inside* that box is also deleted.
  This collateral is usually small (a scribble is small/dense, so crossed strokes
  cluster) but grows when the scribble crosses a long stroke or two far-apart
  strokes. It is always recoverable via Undo. See "Limits and edge cases".

### Scribble detection
A stroke counts as a "scribble" if it oscillates back and forth many times — the
defining trait of a zigzag/cross-hatch. Concretely (calibrated against a labeled
corpus):
- Project the stroke's points onto each of its two principal axes (PCA) and
  count direction reversals along each, ignoring sub-deadband wiggles; take the
  larger of the two counts. A stroke is a scribble when that count meets a
  threshold (currently **≥ 10**).
- The path-length / bounding-box-diagonal **ratio is deliberately NOT used**: in
  the corpus it failed to separate (dense cursive reached 3.3 while real
  scribbles dropped to 1.3). Reversal count is the sole discriminator.

The reversal margin between normal writing and scribbles is real but not huge
(normal handwriting in the corpus topped out at 8). The threshold is the knob to
revisit if false positives appear; because the erase is undoable, a rare false
positive is recoverable.

Single continuous stroke only (one pen-down-to-up). Classification is cheap and
computed from the stroke's own points (two bridge calls to read them) — no SDK
read of other elements happens unless the stroke is already classified a
scribble.

## Persistence

None beyond the page edit itself. This is a one-shot transform (delete N
elements); the `.note` file's own persistence covers it. No plugin `userData`
is written or read.

## Undo

The feature must be undo'able, and is. Undo comes from the host's normal undo
stack, not a plugin API. The deciding factor (established on-device): edits made
through the **lasso / interactive pipeline** (`lassoElements` →
`deleteLassoElements`) are recorded on the undo stack, while file-level
`PluginFileAPI` writes (`deleteElements` / `insertElements` / `replaceElements`)
are **not**. Scribble therefore deletes via the lasso pipeline. (This also
explains the SPEC's earlier puzzle: shape-snap's lasso path is undoable;
collapse-expand's file-level path is not.)

## Limits and edge cases

- A scribble that only partially crosses a stroke still deletes that stroke
  **in full** — no partial/clipped erase.
- Multi-stroke scribbles (pen lifted mid-gesture) are not detected; each
  stroke is classified independently.
- **Collateral deletion.** Because the lasso selects by rectangle, an untouched
  stroke that lies fully inside the bounding box of the crossed strokes is also
  deleted. Recoverable via Undo. As a guard, if the lasso selection is far larger
  than the set of strokes actually detected as crossed, the operation aborts
  rather than mass-deleting.

## Open questions / SDK feasibility risks — resolved by the Step-0 spike

1. **False positives.** RESOLVED to "acceptable, recoverable." The detector is
   reversal-based (≥10) and false positives are recoverable via Undo (the erase
   goes through the undoable lasso pipeline). No confirmation modal is needed,
   preserving the "just scribble" flow. The reversal threshold stays the tuning
   knob; the normal-vs-scribble margin is real but modest.
2. **Undo.** RESOLVED. The lasso/interactive pipeline is undoable; file-level
   writes are not. Scribble deletes via the lasso pipeline. (See "Undo".)
3. **"Crosses" geometric definition.** RESOLVED as: bbox prefilter (candidate
   stroke's bbox overlaps the scribble's bbox) → true polyline segment
   intersection between the scribble path and the candidate. The actual delete
   then targets the union bounding box of the crossed strokes (lasso constraint),
   with the collateral caveat above.
4. **Cost of finding candidates.** ACCEPTED. Detection runs first from the
   stroke's own points (no page read); only a confirmed scribble pays the
   `getElements` page read. A future optimization is a native module (see
   `SDK_DOC.md`).
5. **`PEN_UP` payload shape.** RESOLVED. The payload delivers the stroke with a
   uuid-keyed points accessor; the full path reads in two bridge calls.
6. **Deleting just-drawn elements.** RESOLVED/MOOT. We do not use file-level
   `deleteElements`; the lasso pipeline selects and deletes just-drawn strokes
   directly (a full-page lasso selected them in testing). File-level writes are
   avoided entirely — they are non-undoable and, with `reloadFile`, can discard
   unsaved strokes.
