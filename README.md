# Scribble

A Supernote (`sn-plugin-lib`) plugin: erase handwriting by scribbling over it,
the way you would on paper. No lasso, no button — draw a tight zigzag over the
strokes you want gone, lift the pen, and both the scribble and the strokes it
crosses disappear.

See `SPEC.md` for the full behaviour specification (source of truth for what
the plugin does) and `AGENT.md` for the development workflow.

## Status

Spec drafted; nothing implemented yet. See `SPEC.md`'s "Open questions / SDK
feasibility risks" section — particularly the risk of irreversible data loss
from a misclassified stroke — before starting implementation.

## Build

```
./buildPlugin.sh
```

Bundles the RN JS, packages `PluginConfig.json` + assets into a `.snplg`, and
pushes it to a connected device via adb.
