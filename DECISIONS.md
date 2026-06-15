# Architectural Decisions

A log of significant, non-obvious design choices and the alternatives that were
rejected. This is the *why* behind the architecture — distinct from CHANGES.md
(*what* changed) and SDK_DOC.md (*what the SDK does*).

## 2026-06-15 — Erase via the lasso pipeline, not the file API

**Decision:** Delete strokes with `lassoElements(rect)` → `deleteLassoElements()`,
never `PluginFileAPI.deleteElements`.

**Why:** A Step-0 spike established that only edits through the lasso/interactive
pipeline are recorded on the host undo stack; file-level `PluginFileAPI` writes
are not undoable. Undo is the safety net for the (rare) false-positive erase, so
it is non-negotiable. The file API is additionally hazardous on the open note:
writes hit the real file while the render uses the cache, and `reloadFile` after
a write discards unsaved strokes.

**Rejected:** (a) `deleteElements` + `reloadFile` — not undoable, and wiped
unsaved strokes on screen. (b) Self-managed undo (stash deleted strokes,
re-insert on demand) — `insertElements` does not round-trip an element
faithfully (position shifts), so restoration is unreliable.

## 2026-06-15 — Rect/union-bbox erase semantics (not exact crossing)

**Decision:** Detect the strokes the scribble path crosses (polyline
intersection), then erase by lassoing the **union bounding box** of those
strokes, with a count-based over-selection guard that aborts if the lasso would
take in far more than the crossed set.

**Why:** The lasso (the only undoable delete) selects by rectangle and only
strokes **fully inside** it — exact "delete just the crossed strokes" is not
expressible. The union bbox guarantees the crossed strokes are inside the rect.
Collateral (untouched strokes fully inside the box) is possible but recoverable
via Undo and bounded by the guard.

**Rejected:** (a) Exact per-stroke deletion — impossible via the rect lasso.
(b) Lassoing only the scribble's own bbox — misses partially-covered strokes,
which is the common case. (c) uuid-based collateral guard — `getElements` and
`getLassoElements` do not share uuid values, so identity matching across them is
unreliable; the guard counts instead.

## 2026-06-15 — Scribble detection: OR of strong-axis and both-axes reversals (supersedes the entry below)

**Decision:** A stroke is a scribble if **either** its stronger PCA axis reverses
≥ 13 times **or** both axes reverse ≥ 10 times (plus a loose bbox cap).

**Why:** Field false positives were cursive handwriting (e.g. "scribble" in
cursive). Cursive oscillates and loops, so it lands close to scribbles on every
single feature tried — max-axis reversals, oscillation wavelength, and retrace/
fill density all overlapped with ~zero margin. Two intermediate rules each failed
on real data:
- *max-axis ≥ 10* (original) fired on cursive (max 12).
- *both-axes ≥ 10* (a "2-D scrub" rule) fixed cursive but produced **false
  negatives** on legitimate one-directional scribbles (weaker axis ~2–6).
The OR rule is what the labeled data actually separates: cursive sat at max 12 /
min 9 — the lone corner failing both tests — while every erase-scribble cleared
one bar or the other (max 13–24, or min 10–22), including 1-D scribbles (high max)
and a borderline 12/12 scribble (caught by min ≥ 10).

**Rejected:** single-threshold rules (above); wavelength / fill-density (don't
separate); a confirmation step (kept the gesture-only flow, with undo as the
backstop).

**Known limitation / future work:** margins are ~1 reversal, so dense/long
cursive can still occasionally trip it (recoverable via undo). A categorical
signal — cursive makes self-intersecting **loops** (l, b, e…), scribbles don't —
is logged in BACKLOG.md as a more robust replacement that could also let the
thresholds drop.

## 2026-06-15 — Scribble detection by reversal count alone (SUPERSEDED)

**Decision:** Classify a stroke as a scribble by its principal-axis reversal
count (PCA, both axes, max) ≥ 10; the path-length/diagonal ratio is not used.

**Why:** Against a labeled corpus, reversal count separated scribbles from normal
handwriting (normal ≤ 8, scribbles 8–22) while the ratio did not (dense cursive
reached 3.3; real scribbles dropped to 1.3). Computed from the stroke's own
points, so it's cheap and runs before any page read.

**Rejected:** Ratio gating — it both passed dense cursive and rejected genuine
(low-ratio) scribbles.
