# Backlog

Open feature requests and deferred items. Worked per the workflows in
`AGENT.md` (features → architect-challenge then implementation). Remove an
item once the corresponding feature is implemented and confirmed.

## Delete not persisting on some firmware (blocked on Ratta)

On some devices/firmware (reported on Manta + one other), `deleteLassoElements`
returns `success: true` but the host does not persist the deletion — the strokes
flash out and are then restored. Confirmed it's not our selection, the
over-selection guard, or the post-delete `setLassoBoxState(2)` (skipping it via an
rc3 test build didn't help). It's a host-side bug with no plugin-side workaround
(file-level `deleteElements` would lose undo + risk cache data-loss; not worth
it). Reported in `FEEDBACK.md`. Re-test once Ratta ships a firmware fix.

## Landscape (split-page) erase

Erase-by-scribble currently skips in landscape (a brief notice, no-op) because
the device shows a **split half-page** there and the host lasso pipeline is
unreliable: the EMR↔screen mapping is not a simple invertible transform, and
`lassoElements` can hang and never return for some rectangles. Blocked on the
SDK exposing split-mode support — `getPageRotationType`, split-aware
`emrPoint2Android`/`getRealMaxX`, and a visible-region/scroll query (see
`FEEDBACK.md`) — or on doing the lasso via a native module. Detection and
crossing already work in landscape (PEN_UP and getElements share the EMR frame);
only the final lasso/delete step is blocked.
