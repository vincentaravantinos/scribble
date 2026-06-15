# Scribble

Erase Supernote handwriting the way you do on paper: scribble back and forth over
the strokes you want gone, lift the pen, and they disappear — along with the
scribble itself. No lasso, no button; it reacts to the gesture.

![Scribble in action](docs/demo.gif)

## Install

1. Download `scribble.snplg` from the
   [latest release](https://github.com/vincentaravantinos/scribble/releases/latest).
2. Copy it to your Supernote (any folder).
3. On the device: **Settings → Plugins → Install plugin →** select
   `scribble.snplg` **→ Install**.

## How to use

- **Erase:** scribble back and forth over the strokes you want to remove (a few
  firm passes, like crossing something out), then lift the pen. The crossed
  strokes and the scribble both vanish.
- **Undo:** changed your mind? Tap the device **Undo** button — everything comes
  back.

That's the whole plugin. There's nothing to open or configure.

### Good to know

- **Normal writing is safe.** Detection requires markedly more back-and-forth
  than handwriting produces, so ordinary writing doesn't trigger an erase. Dense
  cursive sits closest to the line, so a rare misread is possible — that's what
  Undo is for.
- **It won't run away.** If a scribble would take in far more content than it
  actually crossed, it cancels itself instead of wiping a large area.

## Limitations

- The device can only delete via a rectangular selection, so an erase is bounded
  by the crossed strokes' bounding box — a stroke sitting *fully inside* that box
  can be removed too. It's always reversible with Undo.
- One continuous scribble per gesture (pen-down to pen-up). If you lift mid-way,
  each piece is judged on its own.
- Slower on very dense pages — to find what a scribble crosses, the plugin reads
  the whole page (a cost the Supernote SDK charges per page, not per selection),
  and only when you actually scribble.

## Build from source

```
./buildPlugin.sh
```

Bundles the React Native JS, packages `PluginConfig.json` + assets into a
`.snplg`, and (with a device connected) pushes it via adb. See `AGENT.md` for the
development workflow and `SPEC.md` for the behaviour specification.
