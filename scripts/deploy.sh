#!/usr/bin/env bash
# Build and force-publish dist/ to the gh-pages branch (Pages source).
# The GitHub Actions workflow does the same on every push to main; this is the local fallback.
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
touch dist/.nojekyll
TMP=$(mktemp -d)
cp -r dist/. "$TMP/"
cd "$TMP"
git init -q -b gh-pages
git add -A
git -c user.name="Pedal Survivors deploy" -c user.email="deploy@pedal-survivors.local" commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%MZ)"
git push -f https://github.com/jakehobbick/pedal-survivors gh-pages:gh-pages 2>&1 | tail -2
rm -rf "$TMP"
