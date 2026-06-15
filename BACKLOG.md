# Backlog

Open feature requests and deferred items. Worked per the workflows in
`AGENT.md` (features → architect-challenge then implementation). Remove an
item once the corresponding feature is implemented and confirmed.

## Loop-based scribble detection (robustness)

The current detector separates scribbles from cursive by reversal-count
thresholds with ~1-reversal margins (see DECISIONS.md), so dense/long cursive can
still occasionally false-positive. A more categorical signal: **cursive makes
self-intersecting loops** (l, b, e, f, k…) while scribbles are open back-and-forth
strokes that don't loop. Measure self-intersections (or accumulated winding) and
use "has loops → it's writing" as a veto. This could both cut false positives and
let the reversal thresholds drop (catching gentler scribbles). Validate with a
labeled corpus (loopy cursive vs scribbles) before adopting.
