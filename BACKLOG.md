# Backlog

Open feature requests and deferred items. Worked per the workflows in
`AGENT.md` (features → architect-challenge then implementation). Remove an
item once the corresponding feature is implemented and confirmed.

## Open

| ID     | Description | Status |
|--------|-------------|--------|
| CR-005 | Adopt sn-plugin-lib 0.2.x unified Android-pixel coordinates — blocked on Ratta (PEN_UP points still EMR, see B-002) | Blocked |

## Closed

| ID     | Description | Status |
|--------|-------------|--------|
| B-001  | Erase over-selection guard removed (always delete, rely on Undo) | Fixed |
| B-002  | Erase broken on sn-plugin-lib 0.2.3 (PEN_UP EMR vs getElements px) — reverted to 0.1.65 | Fixed |
| CR-001 | Upgrade sn-plugin-lib + declare plugin permissions (FILE:READ only, requested lazily on first erase) | Done |
| CR-002 | lassoElements out-of-bounds requirement — already compliant, confirmed on-device, no code change | Done |
| CR-003 | 1-indexed page/element indices — not applicable, Scribble doesn't use the affected APIs | Done |
| CR-004 | Faster large-area erase via modifyPageElements — rejected, premise doesn't hold (delete step already batched; real cost is the read/crossing-scan step, untouched by this SDK release) | Rejected |

## Delete not persisting on some firmware (blocked on Ratta)

On some devices/firmware (reported on Manta + one other), `deleteLassoElements`
returns `success: true` but the host does not persist the deletion — the strokes
flash out and are then restored. Confirmed it's not our selection, the
over-selection guard, or the post-delete `setLassoBoxState(2)` (skipping it via an
rc3 test build didn't help). It's a host-side bug with no plugin-side workaround
(file-level `deleteElements` would lose undo + risk cache data-loss; not worth
it). Reported in `FEEDBACK.md`. Re-test once Ratta ships a firmware fix.

## Gate erase-by-scribble on the physical side button (blocked, no SDK hook)

Idea: let the user opt into a mode where erase-by-scribble only fires when the
scribble stroke is drawn while the device's physical side button is held —
today the feature is gesture-only, no button. Checked the SDK
(`sn-plugin-lib`): plugins only receive three events — `PEN_UP`,
`IMPORT_STICKER`, `MOTION_EVENT` — none of which expose the hardware
chassis button's press/release/held state. (Note: the SDK's
`PluginSideButton` class is the in-app sidebar UI button, not the physical
one — unrelated.) There is currently no way for a plugin to observe this
signal at all, so the opt-in mode can't be built. Re-check if/when the SDK
exposes a hardware button event.

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
