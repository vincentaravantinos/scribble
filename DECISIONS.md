# Architectural Decisions

A log of significant, non-obvious design choices and the alternatives that were
rejected. This is the *why* behind the architecture — distinct from CHANGES.md
(*what* changed) and SDK_DOC.md (*what the SDK does*).

## 2026-06-18 — Erase robustness: relax the guard, clean up on cancel, real dialogs

**Decision:** Raise the over-selection guard's collateral cap (3 → 12); on cancel,
delete just the scribble (lasso its own box) so the gesture leaves no mark; route
user messages through the host dialog (`showRattaDialog`) instead of RN's global
`alert()`; and pad the lasso rect outward a few px so boundary strokes aren't
missed.

**Why:** Field reports of "scribble shows 'working…' but nothing deletes." Causes:
(1) on dense pages the union-bbox lasso legitimately encloses a word's un-crossed
strokes, so the count-based guard (cap 3) cancelled normal erases — the count is a
loose proxy and had to be generous; (2) the cancel was *silent* (RN `alert()`
doesn't surface in the host) and left the scribble on the page; (3) on higher-DPI
devices (Manta/A5X2) a tighter "fully inside" lasso dropped the scribble — always
the boundary stroke of the union box — erasing the text but not the scribble.

**Rejected:** (a) Per-stroke lasso/delete (delete exactly the crossed strokes) —
correct semantics, but N lasso cycles = N e-ink refreshes per erase, too visually
noisy. (b) Size/area-based guard (allow while the deletion stays within the
scribbled area) — cleaner in principle but a larger change; deferred in favor of
simply raising the count cap.

## 2026-06-17 — Landscape erase not supported; skip in landscape

**Decision:** Erase-by-scribble runs in portrait only. In landscape
(`getOrientation()` ∈ {1, 3}) a detected scribble shows a brief notice and does
nothing, gated before any lasso call.

**Why:** In landscape the device renders a **split half-page**, and the host
lasso pipeline — the only undoable delete path — does not work there. A focused
investigation established two independent blockers: (a) the EMR→screen mapping in
split mode is **not a simple invertible transform** (a rotation-robust probe
found different page positions collapsing to the same pixel footprint, i.e. the
lasso doesn't localise by position), and (b) `lassoElements` **hangs and never
returns** for some rectangles in this mode, which would freeze the plugin. The
SDK exposes no split-mode coordinate conversion (`getRealMaxX`/`emrPoint2Android`
throw on split page sizes, `getPageRotationType` is stubbed) and no
visible-region query, so there is no reliable way to aim the lasso. Given an
errant lasso in an *eraser* either deletes the wrong ink or hangs, skipping is
the only safe behaviour. Detection and crossing themselves do work in landscape
(PEN_UP and getElements share the EMR frame), so only the delete step is gated.

**Rejected:** (a) Reverse-engineering the split transform — empirically the
mapping isn't a clean affine and the measurement itself is blocked by the
`lassoElements` hang; even a perfect transform couldn't be issued safely.
(b) A native-module lasso — possible but out of scope; logged in BACKLOG.md.
(c) Shipping without a guard — v1.1.0's portrait transform would still fire
`lassoElements` in landscape and risk the hang, so the guard is a safety fix, not
a feature.

**Constraint for future work:** unblocked only by SDK split-mode support
(`getPageRotationType`, split-aware converters, visible-half query — see
FEEDBACK.md) or a native-module delete path.

## 2026-06-17 — Scribble detection by direction CONSISTENCY (final; supersedes all prior detection entries)

**Decision:** Classify a stroke as a scribble by **direction consistency** — the
length-weighted circular concentration of its segment directions (doubled so a
180°-apart back-and-forth reinforces): `conc ≥ 0.85` AND it reverses ≥ 5 times
along that axis (+ a loose bbox cap). Computed from the stroke's own points; no
page read. The erase still goes through the lasso pipeline.

**Why:** A scribble and (even zig-zaggy) cursive have the same *shape*, so every
shape feature failed — reversal count (max-axis, both-axes), oscillation
wavelength, retrace/fill density, self-intersection loop count and area, and
principal-axis orientation all overlapped between the classes on real data. The
separating property is that a scribble goes **one consistent direction** while
handwriting (letters, ligatures, loops) goes **many**. On an intent-labeled corpus
of real strokes, scribbles measured consistency 0.96–0.98 and words ≤ 0.77 — a
wide margin, **0 false positives / 0 false negatives**. It is also
orientation-agnostic (the user's scribbles are diagonal, but the rule doesn't
depend on that). Pinned by a regression test against the saved corpus
(`__tests__/fixtures/scribble-corpus.json`).

**Rejected (all tested on real data, all overlapped):** max-axis reversals
(≥10/≥13); both-axes "2-D scrub" (≥10/≥12) — caused false negatives on
1-D scribbles; an OR of the two — false-positived on dense cursive; wavelength;
retrace/fill density; loop count and loop area; principal-axis "diagness"
(measured elongation, not the user-perceived sweep direction). Also rejected the
**context/overlap method** (erase only if the stroke crosses existing ink): it is
*correct* and is how OneNote/GoodNotes do it, but on this SDK the required
`getElements` page read is ~4 s and would run on every scribbly-shaped stroke
(incl. cursive), freezing writing — not viable without a native module.

**Tooling note:** logcat drops ~10–60% of lines (worse for long/point lines, and
under rapid input), which repeatedly corrupted small-sample analysis. The fix was
to capture downsampled stroke points (with a seq counter to detect drops) into a
saved fixture and develop the classifier **offline** against it. A reliable
on-device capture would need a small native file-export module (the same module
that would make the overlap method fast).

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

## 2026-06-16 — Scribble detection: 2-D scrub only (weaker axis ≥ 13); 1-D not detectable

**Decision:** A stroke is a scribble only if **both** PCA axes oscillate — gate on
the weaker axis's reversal count (≥ 13). A single-direction (1-D) zigzag is, by
design, not detected.

**Why:** This was settled empirically after the OR rule below kept false-positiving
on more cursive ("menu", "express"). A 1-D scribble and a cursive word are the
**same gesture** — a zigzag that advances along a line — and a full labeled corpus
showed they are inseparable on *every* feature tried: max-axis reversals, weaker-
axis reversals, oscillation wavelength, retrace/fill density, self-intersection
(loop) **count**, and loop **area** all overlap (e.g. 1-D scribble `maj 6/min 13`
vs cursive `maj 2/min 13`; loop areas: cursive 6–131, scribbles 7–64). The only
robust separator is dimensionality: an erase-scribble fills an area (oscillates in
**both** directions), cursive does not. On intent-labeled data, writing (cursive
plus a dense compact word) reached weaker-axis 12; 2-D scrubs measured 13–33, so
the bar is 13. The PO accepted the tradeoff that a 1-D zigzag won't erase (it
can't be told from writing) in exchange for no false positives.

**Rejected:** max-axis ≥ N (fires on cursive); the OR rule below (fires on 2-D-ish
cursive like "menu"/"express"); **loop count and loop area** (tested with a
dedicated instrumented build — do not separate; scribbles self-cross via
overlapping passes and can enclose large areas too); a confirmation step / hybrid
auto+confirm (PO preferred no UI over catching 1-D scribbles).

**Tradeoff / knob:** a one-directional zigzag no longer erases — users scrub in
both directions. Weaker-axis margin to writing is ~1 (writing 12, bar 13); undo
remains the backstop for a rare misread.

## 2026-06-15 — Scribble detection: OR of strong-axis and both-axes reversals (SUPERSEDED 2026-06-16)

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
