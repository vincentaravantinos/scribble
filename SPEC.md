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
- Every pre-existing stroke that the scribble's path crosses/covers is also
  deleted.
- Content that isn't crossed by the scribble is untouched, even if it's on the
  same page or nearby.

### Scribble detection
A stroke counts as a "scribble" if its drawn path is small and dense relative
to normal handwriting — concretely (placeholder thresholds, to be tuned):
- the path reverses direction many times within a small bounding box (a
  back-and-forth zigzag or cross-hatch), and
- the ratio of total path length to bounding-box diagonal is high (the pen
  covered the same small area repeatedly).

Single continuous stroke only (one pen-down-to-up). Classification must be
cheap and computed from the stroke's own points — no SDK read of other
elements unless the stroke already looks like a scribble.

## Persistence

None beyond the page edit itself. This is a one-shot transform (delete N
elements); the `.note` file's own persistence covers it. No plugin `userData`
is written or read.

## Limits and edge cases

- Only **strokes** (ink) are erase candidates, both as the scribble and as
  targets. Text boxes, pictures, titles, links, and geometry are left alone
  even if the scribble crosses them.
- A scribble that only partially crosses a stroke still deletes that stroke
  **in full** — no partial/clipped erase.
- Multi-stroke scribbles (pen lifted mid-gesture) are not detected; each
  stroke is classified independently.

## Open questions / SDK feasibility risks

1. **False positives are destructive and likely unrecoverable.** If normal
   handwriting (e.g. a tightly-looped cursive word, a filled-in shape, repeated
   tracing) is misclassified as a scribble, the user's content — and whatever
   it crosses — is deleted with no undo path that we know of. This is the
   central risk and needs either: a very conservative detector tuned against
   real handwriting samples, a confirmation step (but the SDK's only
   confirmation UI is a blocking modal, which breaks the "just scribble"
   flow), or a deliberate "uncommon" gesture shape (e.g. requiring more
   reversals than any normal letterform produces).
2. **No undo API found in `sn-plugin-lib`** (not yet re-checked for this
   project) — confirm whether one exists before relying on "it's reversible if
   we get it wrong."
3. **"Crosses" needs a real geometric definition.** Bounding-box overlap is
   cheap but coarse (two strokes can share a bbox without ever crossing);
   true path/path intersection is more accurate but costs more per candidate.
   Needs a cost/accuracy tradeoff once we know how many candidate strokes a
   typical page has.
4. **Cost of finding candidates.** `getElements` marshals every element on the
   page (documented as expensive on dense pages). The scribble-classification
   step must reject ordinary strokes *before* any SDK read, so normal writing
   never pays this cost — only an actual scribble gesture does.
5. **`PEN_UP` payload shape for a stroke** — confirm it includes the full
   `points`/`pressures` array (needed for the zigzag/reversal analysis) and
   not just metadata.
6. **Deleting elements that were *just* inserted by this same `PEN_UP`.** The
   scribble stroke itself was just drawn — confirm `deleteElements` can target
   it immediately (vs. the real/cached file split documented in `SDK_DOC.md`
   requiring a `reloadFile` before a just-written element is visible/targetable
   again).
