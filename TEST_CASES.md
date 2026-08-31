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
