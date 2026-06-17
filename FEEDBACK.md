# Feedback for Ratta (r/Supernote_dev)

Terse, paste-ready notes for the plugin-preview thread. Two formats only — a
one-line doc request, or a bug as numbered repro steps + `expected:` / `observed:`.

---

doc of undo behavior is missing, here is a proposal: document which plugin edits the device Undo can reverse. In practice lasso-pipeline edits (lassoElements/deleteLassoElements/insertGeometry) are undoable while file-level PluginFileAPI writes (deleteElements/insertElements/replaceElements) are not. Please confirm and document this.

doc of PointUtils.emrPoint2Android is unclear, here is a proposal: state which EMR maximum it uses and how it relates to getPageSize. On our device getPageSize returns 1404x1872 but the page's actual EMR max (element.maxX/maxY) is ~20967x15725, so emrPoint2Android scales wrong and the converted point lands ~0.75x off. Document the correct EMR max source (element maxX/maxY?) for screen conversion.

doc of getLassoElements is unclear, here is a proposal: state that element uuid (and numInPage) from getLassoElements are not guaranteed to match the same stroke's uuid/numInPage from getElements, so they can't be used to correlate selections across the two APIs.

Bug: insertElements does not preserve an element's position on re-insert.
1. getElements on a page, keep one stroke element.
2. insertElements that same element back into the page.
3. reloadFile and view the page.
expected: the stroke is re-inserted at its original position.
observed: the stroke is re-inserted shifted to a different position.

Bug: lassoElements never returns (hangs the plugin) for some rectangles when the page is in a landscape split orientation.
1. Rotate the device to landscape so the page shows a split half-page (getOrientation returns 1 or 3).
2. From a plugin, call lassoElements with an integer rect in the lower region of the page coordinate space, e.g. { left: 720, top: 1620, right: 1080, bottom: 1871 } on a 1404x1872 page.
3. await the result.
expected: the promise resolves (selection made, or empty selection).
observed: the call never returns; the plugin hangs (no getLassoElements/setLassoBoxState afterwards possible).

doc of landscape/split coordinate handling is missing, here is a proposal: expose getPageRotationType (currently stubbed) and make emrPoint2Android / getRealMaxX support the split rotation types (ROTATION_90_UD etc.), plus a way to query the currently-visible half. Today getPageSize is unchanged in landscape, the real EMR max differs per rotation, and the converters throw on split page sizes, so plugins cannot map EMR<->screen in landscape at all.

Bug: reloadFile after a file-level write discards unsaved strokes.
1. Draw a few strokes by hand (do not save).
2. From a plugin, call deleteElements (or any PluginFileAPI write) on the page.
3. Call reloadFile.
expected: only the targeted element changes; the hand-drawn strokes remain.
observed: all unsaved hand-drawn strokes disappear (cache is overwritten from the real file, which never received them).
