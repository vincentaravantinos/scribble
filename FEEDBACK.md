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

Bug: reloadFile after a file-level write discards unsaved strokes.
1. Draw a few strokes by hand (do not save).
2. From a plugin, call deleteElements (or any PluginFileAPI write) on the page.
3. Call reloadFile.
expected: only the targeted element changes; the hand-drawn strokes remain.
observed: all unsaved hand-drawn strokes disappear (cache is overwritten from the real file, which never received them).
