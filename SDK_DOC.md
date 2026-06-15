# Supernote Plugin SDK — Reference Supplement

A complement to the official plugin-SDK docs (https://docs.supernote.com/en),
covering behavior they don't document or leave ambiguous. Written for plugin
authors using the API: each section states how an API behaves and how to use it
correctly. Keep entries factual and concise — describe the API, not how we
discovered it.

---

## Picture elements: `picture.picturePath` is not stable across a round-trip

When you insert a picture element you supply a real on-disk path (e.g. a bundled
asset under your plugin directory). After the element is saved and read back via
`getElements` / `getLassoElements`, its `picture.picturePath` is replaced with an
SDK-internal cache reference of the form
`/storage/emulated/0/.data/plugin/<millis>.png`. That cache path often does not
exist on disk even though the picture renders correctly (the image bytes are
stored with the note).

- Treat `picture.picturePath` from a read-back element as opaque; do not rely on
  it pointing to a readable file.
- `modifyElements` on a picture reads the source image from `picture.picturePath`
  and fails with **error 1211** ("PNG file does not exist. Cannot call the
  API!") if it doesn't resolve to a readable file — even when you only intend to
  change `userData`. Before calling `modifyElements`, re-assign
  `picture.picturePath` to a path you control (e.g. re-resolve the bundled asset
  via `PluginManager.getPluginDirPath()`).

The cache directory `/storage/emulated/0/.data/plugin/` accumulates one
`<millis>.png` per picture insert and is not cleaned up (files persist after the
note is deleted). This is device-side; a plugin cannot manage it.

---

## Lassoed elements are stale after a move — read and write via `getElements`

The elements from `getLassoElements` (the user's selection passed to your button
handler) can be a **stale snapshot** of an element that has been moved:

- **Position is stale.** A moved picture's `picture.rect` from `getLassoElements`
  is the pre-move position. (For pictures no other position field is populated:
  top-level `rect`, `x/y`, `boundingRect` are absent; `maxX/maxY` are page EMR
  dimensions, not a position.) `getElements` returns the current position.
- **Identity is stale.** The lassoed element's `numInPage` can also be stale, so
  `modifyElements([lassoedElement])` targets the wrong slot and **silently fails
  to persist** while still reporting success.

Use the lassoed element only to identify which element/section the user selected.
For both reads and writes, resolve the element fresh from `getElements` (matched
by a stable key you control, e.g. your own `userData` id), after `saveCurrentNote`
so the move is reflected.

---

## `modifyElements` cannot resize a picture; a committed move shrinks it

- `insertElements` honors a picture's `rect` (size and position).
- `modifyElements` updates `userData` but does **not** apply a picture's `rect`;
  it cannot resize a picture.
- Committing a *move* of a picture — via any save, including the app's autosave
  when the user taps away after dragging — rescales it to ~14×14 px regardless of
  its original size. Position is preserved; size is corrupted. Reproducible with
  no plugin involved.

To set or restore a picture's size, delete and re-insert it.

---

## Always dismiss the lasso before returning — `setLassoBoxState(2)`

`setLassoBoxState(state)`: `0` = show; `1` = hide the menu but keep the selection;
`2` = commit the selection back to the page and release it.

Any operation with an active lasso — the user's selection that triggered your
button, or a `lassoElements(rect)` you opened yourself — must close it with
`setLassoBoxState(2)` before the handler returns, and before any file-level
mutation. There is a single global lasso selection, so one `setLassoBoxState(2)`
closes whatever is open. Closing does not undo committed inserts/deletes.

Leaving a lasso open across a mutation (`insertElements` / `deleteElements` /
`saveCurrentNote`) makes the host's plugin-facing element list drift from the note
model. The drift is cumulative and silent: mutations begin returning
`success: true` while doing nothing, until the note app is restarted.

```
// Mutating the user's selection: mutate, then close at the end.
deleteLassoElements();
insertElements([...]);
setLassoBoxState(2);

// Opening a lasso only to read: close immediately after reading,
// before any mutation.
lassoElements(rect);
const els = getLassoElements();
setLassoBoxState(2);
insertElements([...]);
```

`setLassoBoxState(2)` does not replace `reloadFile()` after an insert (see below).

---

## The open note renders a cached copy; surface writes with `reloadFile`

An open note does not render its real `.note` file directly — it renders a
**cached copy**. `insertElements` / `deleteElements` write the **real** file; the
host then syncs real→cached **asynchronously**, and that sync may not have
completed when the write call returns.

- **Reads of the open note come from the cached copy.** `getElements`,
  `getElementNumList`, and the other element reads on the currently-open note read
  the cached copy, so immediately after a write they can return stale data —
  inserts not yet visible, deletes still present — while still reporting success.
  The staleness can persist indefinitely, not just briefly. A before/after
  `getElementNumList` diff to detect just-inserted elements therefore returns
  nothing unless you `reloadFile` between the write and the second read.
- **Do not `saveCurrentNote` immediately after a write.** `saveCurrentNote` writes
  the cached copy back to the real file; if the real→cached sync hasn't landed it
  overwrites the real file with the stale cache and discards your write. If you
  need `saveCurrentNote` to flush user strokes, call it *before* the plugin write.
- **Use `reloadFile()` to surface a write.** It reloads the cached copy from the
  real file, deterministically reflecting the write.

```
insertElements([...]);   // writes the real file
// no saveCurrentNote here
reloadFile();            // cached := real; the change now renders
```

`modifyElements` can return **error 102** ("This app is not allowed to use this
API. Please call a different API.") when the note is not in a stable editable
state (mid-reload, just after a crash, during a hung operation). Treat a stable,
loaded note as a precondition for `modifyElements`.

---

## Stroke links (`Link.category = 1`)

A stroke (handwritten) link is a `Link` element with `category = 1` whose
`controlTrailNums` lists the `numInPage` of the strokes that form the link.
When recreating one with `insertElements`:

- `controlTrailNums` references strokes by page number, which change when the
  strokes are re-inserted. So re-insert the member strokes, determine their new
  `numInPage`, and set `controlTrailNums` to those. `controlTrailNums` is treated
  as a set — order is irrelevant.
- Empty `controlTrailNums` → **error 510** ("Stroke link has no control stroke
  numbers. Cannot call the API.").
- Empty/zero area rect → **error 509** ("Invalid link area. Please set it
  again!"); you must pass a non-zero `X/Y/width/height`.
- For `category = 1` the SDK **ignores the passed area and recomputes it** from
  `controlTrailNums` (the strokes' bounding box plus a few px of padding). The
  rect you pass is only a non-empty placeholder to clear validation; the final
  area is device-controlled and cannot be widened from the plugin. (An
  interactively-created stroke link reserves extra room for its auto-added link
  icon; a re-inserted one gets the tight bounding box, so the icon falls outside
  the clickable area.) Text links (`category = 0`) do honor their passed rect.

---

## Geometry elements

- `Geometry.type` is one of `straightLine`, `GEO_circle`, `GEO_ellipse`,
  `GEO_polygon`. A `GEO_polygon` renders an **outline** through its `points`
  (not a filled shape) — to fake a filled rectangle, stack concentric polygon
  rings with a thick `penWidth`.
- `penType` only has **solid** pens (10 = fineliner, 1 = pressure, 11 = marker,
  14 = calligraphy). There is **no dashed/dotted line style** for geometry; a
  dashed border exists only for link elements (`Link.style = 2`) and the lasso
  box. A dotted outline must be faked from many short segments.
- `penWidth` scales roughly 100 units per on-screen px (≈18000 renders a ~180px
  band); `penColor` accepts only specific palette values (e.g. `0x00` black,
  `0x9D` dark gray, `0xC9` light gray, `0xFE` white). `penType` 0 is rejected.
- `points` are Android screen coordinates (relative to top-left), not EMR.

---

## Render order is fixed by element type, not by insertion order or layer

The device composites a page in a fixed order **by element type**, not by element
num (insertion order) and not overridable per-layer: **text boxes draw beneath
handwriting and geometry**. So a stroke or `GEO_polygon` always covers a text box
that overlaps it, regardless of which was inserted/created first or what layer
either is on. (Confirmed both interactively — drawing ink over an existing text
box hides the text — and via the SDK.) Within the "above text" group, strokes and
geometry order by insertion num as expected.

Consequence: you cannot place a text box on top of a geometry fill. A white fill
used to hide content will also hide any text box under it; there's no insertion
order or `layerNum` that lifts the text above the fill.

---

## Plugin event listeners (`PluginManager`)

For reacting to user input outside the plugin button:

- **`registerEventListener(EventType.PEN_UP, registerType, listener)`** — fires
  when the pen lifts after **drawing**; `listener.onMsg(data)` receives the
  element(s) just drawn. It does **not** fire when the user *moves* a selection
  (drags an already-selected element), so it can't detect an element move. The
  SDK comment notes only `event_pen_up` is supported via this call.
- **`registerMotionListener(registerType, listener)`** — raw touch. `onMsg(m)`
  receives a `MotionEvent`: `action` (0=DOWN, 1=UP, 2=MOVE, 3=CANCEL), primary
  `x`/`y`, `pointers[]` (each `x/y/pressure/toolType/pointerId`), `pointerCount`,
  `toolType` (1=finger, 2=pen), `downTime`/`eventTime`. It **does** fire
  throughout a selection-drag, so `ACTION_UP` is a usable "gesture ended" signal.
  Caveats: it fires for *every* touch (draw/scroll/tap), `ACTION_MOVE` streams at
  high frequency (cheap to ignore with an early `action` check), and the payload
  carries **no element identity** — only coordinates. To know *what* moved you
  must correlate the touch position with element rects yourself (and the `UP`
  event carries `downTime` but not the down coordinates, so capture the start
  point on `ACTION_DOWN` if you need it).
- `registerType`: 0 = always first, 1 = normal, 2 = always last (ordering when
  multiple plugins register the same event).

---

## Toolbar button labels are fixed for the open toolbar

`PluginManager.registerButton(type, appTypes, {id, name, icon, ...})` sets the
button label (`name`) at registration. There is **no** call to change a label
in place — only `unregisterButton(id)`, `getButtonState`/`setButtonState`
(enable/disable), and re-registering.

Re-registering with the same `id` and a new `name` does **not** relabel the
button on a lasso toolbar that is **already open**; the new label only takes
effect the next time the toolbar opens. The host snapshots button definitions
when the toolbar renders. Combined with the fact that **no event fires when a
selection is made or the lasso menu opens** (the only events are `PEN_UP`,
`IMPORT_STICKER`, `MOTION_EVENT`, and the button listener fires on *press*), a
plugin **cannot** make a lasso-toolbar button's label reflect the current
selection — there is no moment at which it can both know the selection and
update the label before the toolbar paints. Plan for a fixed label.

---

## JS timers don't fire while the plugin is idle

`setTimeout` / `setInterval` callbacks only run when the JS runtime is being
ticked by something else — a native event (button press, motion event) or an
in-flight `await` resolving. While the plugin sits idle (no user input, nothing
awaiting), the event loop is **not pumped** and scheduled callbacks do **not**
fire; they flush late, the next time the runtime is woken. Verified with a
`setInterval` heartbeat: silent at rest, ticking only during an active operation.

Consequence: do not rely on a deferred timer to do work after user input ends
(e.g. a debounce that runs "300 ms after the last touch"). It will not fire until
the next touch. Trigger such work directly from the input event instead, and
coalesce with a guard/flag rather than a timer.

## Non-blocking UI: the plugin's own view

The native dialogs (`NativeUIUtils.showRattaDialog`, `showErrorTipDialog`, and
`alert`) are **blocking modals** — they suspend the calling operation, so they
can't show progress *during* one. The only non-blocking UI surface is the
plugin's **own React view**, toggled with `PluginManager.showPluginView()` /
`closePluginView()` (the component registered via `AppRegistry`). Showing it does
not block JS execution, so an operation can `showPluginView()`, do its work, then
`closePluginView()` in a `finally`. Notes: e-ink does not alpha-blend (a
translucent backdrop renders solid, blanking the canvas — use a transparent
backdrop with only the visible widgets drawn), and there is no separate toast or
spinner primitive.

---

## Performance: element I/O cost scales with the whole page, not your selection

Every `PluginFileAPI` element call pays a cost proportional to the **total number
of elements on the page**, not to how many elements the operation actually
touches. On a page of a few hundred handwritten strokes each call runs for
seconds, so a collapse/expand-style operation made of several calls can take 10+
seconds even when the user selected only a handful of strokes. Rough magnitudes
(order-of-magnitude, not exact):

| Call | Cost driver | Relative cost |
|---|---|---|
| `getElements(page, path)` | marshals **every** element across the JS bridge | high — ~tens of ms per element on the page |
| `getElementNumList` | returns only the num array | ~an order of magnitude cheaper than `getElements` |
| `getElement(path, page, num)` | one element | cheap (~tens of ms total) |
| `insertElements` / `modifyElements` / `deleteElements` | rewrites/reprocesses the whole page file | high, **and roughly fixed regardless of how many elements you pass** (1 or 30 cost about the same) |
| `saveCurrentNote` | persists the whole note | high |
| `reloadFile` | re-renders the page | moderate |

Practical consequences:

- **Reads — fetch only what you need.** Don't call `getElements` if you only need
  a few specific elements or just their nums. `getElementNumList` + a few
  `getElement` calls is much cheaper than the full read, because `getElement` is
  cheap and the full read marshals the entire page. The crossover is high (dozens
  of `getElement` calls still beat one `getElements`), but past some count the
  full read wins — cap it and fall back. (`getElement`/`getElementNumList` read
  the cached copy, same as `getElements`.)
- **Writes — minimise the *number* of calls, not their size.** Because each
  write call reprocesses the whole page, batching many elements into one
  `insertElements` is essentially free relative to the per-call cost, while making
  two separate write calls roughly doubles the time. There is no cheap "update one
  element" — `modifyElements` on a single element costs about as much as inserting
  many. This per-write cost is the hard floor for an operation's latency on a
  dense page.
- The biggest lever for the write floor is to do the element I/O in a **native
  module** (next section), which avoids the JS↔native bridge marshalling; the
  host-side commit/render still runs, but the per-element bridge cost disappears.

## Beyond the JS bridge: native host API and background execution

- **`HostCommonAPI`** (the Java host surface, in
  `node_modules/sn-plugin-lib/android/.../api/HostCommonAPI.java`) exposes the
  full element API — writes (`insertElements`, `modifyElements`, `deleteElements`,
  `replaceElements`, `insertGeometry`, `insertText`), reads (`getElements`,
  `getElement`, `getElementCounts`, `getElementNumList`, `getLastElement`), and
  `PluginAppAPI.readTrailsFromFile(path)` plus trail-cache access. Calling it from
  a native module bypasses the React Native JS↔native bridge, which is the main
  per-stroke cost of `points.size()` + `getRange()` (read) and `createElement` +
  `setRange` (write). The host-side commit/render still runs regardless of caller.
- **Background execution** is possible via React Native Headless JS or a Java
  background thread.
- **`getCacheElement` (PluginCommAPI)** exists but is undocumented; likely a
  cache-backed element read. Semantics unconfirmed — avoid until documented.

---

## Undo is recorded only for lasso / interactive-pipeline edits

The host's undo stack records edits made through the **lasso / interactive
pipeline** — `lassoElements(rect)` → `deleteLassoElements()`, `insertGeometry()`,
etc. The device Undo reverses these.

Edits made through the **file-level `PluginFileAPI`** — `deleteElements`,
`insertElements`, `replaceElements`, `modifyElements` — are **not** recorded and
cannot be undone from the device.

To make a plugin's edit reversible by the user, route it through the lasso
pipeline. There is no plugin-facing undo API; this is the only lever. (A delete
of arbitrary elements becomes undoable by selecting them with `lassoElements`
and calling `deleteLassoElements`, rather than `deleteElements`.)

---

## `lassoElements(rect)`: coordinate space and selection semantics

`lassoElements({left, top, right, bottom})` opens a programmatic lasso over a
rectangle.

- **Coordinates are integer Android/screen pixels.** Non-integer values fail with
  **error 107** ("lassoElements.left must be an integer"). Stroke points are in
  EMR space, so convert and round outward to integers. The conversion **swaps and
  flips axes** (a rotation, not just a scale), so convert the bbox corners and
  rebuild left/top/right/bottom from their min/max — do not feed EMR coordinates
  directly.
- **Do not trust `PointUtils.emrPoint2Android` blindly for the scale.** It derives
  the EMR maximum from `pageSize` via a hard-coded per-model table, which can be
  **wrong** when a device's real EMR range differs from the reported `pageSize`
  (e.g. `pageSize` 1404×1872 but the page's actual EMR max is ~20967×15725). The
  result is a rect scaled ~0.75× and shifted off the target, selecting nothing.
  An element's own `maxX`/`maxY` fields carry the page's **true** EMR max — scale
  by those instead: `mtX = maxX/(pageSize.height-1)`, `mtY = maxY/(pageSize.width-1)`,
  then `screen = { x: pageSize.width-1 - emr.y/mtY, y: emr.x/mtX }`.
- **Selection is "fully inside" only.** A stroke is selected only if it lies
  entirely within the rectangle; a stroke that merely overlaps the rect edge is
  not selected. To erase strokes a small mark crosses, lasso the **union
  bounding box** of those strokes (which then also catches any unrelated stroke
  fully inside that box).
- **Just-drawn strokes are selectable** — a lasso (e.g. full-page) selects
  strokes the user drew moments earlier, without a save first. Confirm a
  selection actually landed with `getLassoElements` before
  `deleteLassoElements`; an empty selection makes `deleteLassoElements` fail with
  **error 904** ("No lasso action has been performed").

---

## `reloadFile` discards unsaved strokes; `insertElements` does not round-trip

Extending the cached-copy behavior above:

- User strokes drawn into the open note live in the **cached copy** until a save.
  `reloadFile` reloads cache←real, so calling it after a file-level write
  **discards any unsaved (cache-only) strokes** — the user's recent writing
  vanishes. Combined with file writes being non-undoable, file-level mutation of
  the open note is hazardous; prefer the lasso pipeline.
- `insertElements` does **not** faithfully round-trip an element read back from
  `getElements`: re-inserting it places the stroke at a **shifted** position. Do
  not rely on delete-then-reinsert to restore an element unchanged.

---

## PEN_UP element identity

The `PEN_UP` payload's element carries a `numInPage`, but it is a
**session/monotonic counter**, not a page index, and does **not** reliably match
the page's `getElementNumList` (which reflects persisted elements). Use the
uuid-keyed accessors for the stroke's data; do not assume the PEN_UP `numInPage`
addresses the element in file-level calls.
