#!/bin/bash
# Rename this template's placeholder project identifiers to a new plugin's
# names. Run once, right after copying the template to a new project
# directory.
#
# Usage:
#   scripts/rename-project.sh <snake_case_name> <PascalCaseName>
#
# Example:
#   scripts/rename-project.sh symbol_definition SymbolDefinition
#
# This updates:
#   - package.json, app.json, android/settings.gradle, android/app/build.gradle,
#     android/app/src/main/res/values/strings.xml ("plugin_template" -> snake_case_name)
#   - app.json, PluginConfig.json ("PluginTemplate" -> PascalCaseName)
#   - PluginConfig.json pluginID ("plugintemplate" -> lowercase(PascalCaseName))
#   - android Kotlin package: com.plugin_template -> com.<snake_case_name>,
#     including renaming the source directory
#   - src/constants.ts LOG tag, App.tsx title, index.js comments

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <snake_case_name> <PascalCaseName>" >&2
  exit 1
fi

SNAKE="$1"
PASCAL="$2"
LOWER=$(echo "$PASCAL" | tr '[:upper:]' '[:lower:]')

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Renaming plugin_template/PluginTemplate -> $SNAKE/$PASCAL ($LOWER)..."

# Text substitutions across the known identifier sites.
FILES=(
  package.json
  app.json
  PluginConfig.json
  src/constants.ts
  App.tsx
  index.js
  android/settings.gradle
  android/app/build.gradle
  android/app/src/main/res/values/strings.xml
  android/app/src/main/java/com/plugin_template/MainActivity.kt
  android/app/src/main/java/com/plugin_template/MainApplication.kt
)

for f in "${FILES[@]}"; do
  [[ -f "$f" ]] || continue
  sed -i '' \
    -e "s/com\\.plugin_template/com.${SNAKE}/g" \
    -e "s/plugin_template/${SNAKE}/g" \
    -e "s/plugintemplate/${LOWER}/g" \
    -e "s/PluginTemplate/${PASCAL}/g" \
    "$f"
done

# Rename the Android Kotlin package directory.
mkdir -p "android/app/src/main/java/com/${SNAKE}"
mv "android/app/src/main/java/com/plugin_template/MainActivity.kt" "android/app/src/main/java/com/${SNAKE}/"
mv "android/app/src/main/java/com/plugin_template/MainApplication.kt" "android/app/src/main/java/com/${SNAKE}/"
rmdir "android/app/src/main/java/com/plugin_template"

echo "Done. Review PluginConfig.json (desc, iconPath, versionName) and SPEC.md."
