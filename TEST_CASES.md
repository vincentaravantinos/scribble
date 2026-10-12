# Test Cases

This project's formal, `SPEC.md`-traceable manual regression suite. Each
case is executed by hand on the tablet. See `.claude/methods/testing.md`.

## First-time permission request

```yaml
id: TC-001
title: First scribble-erase requests file-read permission, then succeeds once granted
traces_to: [REQ-010, REQ-020]
steps:
  - If Scribble already has the read-files permission, revoke it first
    (Settings → Apps → Plugins → Scribble → Permissions).
  - Write a few strokes on a note page.
  - Scribble back and forth over one of the strokes to trigger an erase.
  - When the permission dialog appears, tap "Always allow".
expected: >
  A permission dialog appears asking to allow Scribble to read the page.
  After allowing, the scribbled-over stroke and the scribble itself are
  deleted, same as a normal erase.
last_result: { status: pass, date: 2026-08-31 }
```

## Permission denied

```yaml
id: TC-002
title: Denying the permission blocks the erase and explains why
traces_to: [REQ-030, REQ-040]
steps:
  - Revoke Scribble's read-files permission (Settings → Apps → Plugins →
    Scribble → Permissions).
  - Write a few strokes on a note page.
  - Scribble back and forth over one of the strokes to trigger an erase.
  - When the permission dialog appears, deny it.
expected: >
  A message box appears explaining that Scribble needs permission to read
  the page in order to erase, and where to grant it. No strokes are
  deleted — the ones the scribble crossed, and the scribble mark itself,
  are still on the page (the scribble's own ink may briefly flash, but
  nothing is actually removed).
last_result: { status: pass, date: 2026-08-31 }
```

## Permission persists across erases

```yaml
id: TC-003
title: "Always allow" is remembered — no repeat dialog on later erases
traces_to: [REQ-050]
steps:
  - With Scribble's read-files permission already set to "Always allow"
    (e.g. right after TC-001), write a few more strokes.
  - Scribble back and forth over one of them to trigger an erase.
expected: >
  No permission dialog appears. The erase happens immediately, same as a
  normal erase.
last_result: { status: pass, date: 2026-08-31 }
```

## Erase near a page edge

```yaml
id: TC-004
title: Erase-by-scribble succeeds when the scribble is drawn near a page edge
traces_to: [REQ-060]
steps:
  - Write a stroke close to one edge of the page (e.g. within a
    fingerwidth of the top or a side margin).
  - Scribble back and forth over it, close enough to the edge that the
    scribble itself nearly touches it, to trigger an erase.
expected: >
  The scribbled-over stroke and the scribble itself are deleted, same as
  an erase away from the edge.
last_result: { status: pass, date: 2026-08-31 }
```

## Scribble erases the word and itself

```yaml
id: TC-005
title: Scribbling over a word erases the word and the scribble
traces_to: [REQ-100, REQ-110]
steps:
  - In portrait, write a word on a note page.
  - Scribble horizontally back and forth over the word and lift the pen.
expected: >
  The word and the scribble both disappear from the page.
last_result: { status: pass, date: 2026-10-12 }
```

## Content outside the erase area stays

```yaml
id: TC-006
title: A word clearly apart from the scribbled one is not erased
traces_to: [REQ-120]
steps:
  - In portrait, write two words on one line with a gap of at least one
    word's width between them.
  - Scribble back and forth over the first word only and lift the pen.
expected: >
  The first word and the scribble disappear; the second word remains on
  the page unchanged.
last_result: { status: pass, date: 2026-10-12 }
```

## Undo restores an erase

```yaml
id: TC-007
title: Undo brings back the strokes a scribble erased
traces_to: [REQ-150]
steps:
  - In portrait, write a word and scribble over it so it is erased.
  - Tap the device's Undo button.
expected: >
  The erased word reappears on the page.
last_result: { status: pass, date: 2026-10-12 }
```

## Handwriting is not mistaken for a scribble

```yaml
id: TC-008
title: Writing ordinary words, including cursive, erases nothing
traces_to: [REQ-200]
steps:
  - In portrait, write a line of printed words.
  - Below it, write a line of cursive words including "minimum" and "www".
expected: >
  Every stroke written stays on the page; nothing disappears.
last_result: { status: pending }
```

## A straight line is not a scribble

```yaml
id: TC-009
title: Drawing a straight line over a word erases nothing
traces_to: [REQ-210]
steps:
  - In portrait, write a word.
  - Draw a single straight line through the word in one stroke and lift
    the pen.
expected: >
  The word and the line both stay on the page.
last_result: { status: pending }
```

## Vertical scribble

```yaml
id: TC-010
title: A vertical scribble over a word erases it
traces_to: [REQ-220]
steps:
  - In portrait, write a word.
  - Scribble up and down (vertically) over the word and lift the pen.
expected: >
  The word and the scribble both disappear from the page.
last_result: { status: pending }
```

## Diagonal scribble

```yaml
id: TC-011
title: A diagonal scribble over a word erases it
traces_to: [REQ-230]
steps:
  - In portrait, write a word.
  - Scribble back and forth diagonally (roughly 45°) over the word and
    lift the pen.
expected: >
  The word and the scribble both disappear from the page.
last_result: { status: pending }
```
