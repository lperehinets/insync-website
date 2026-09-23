#!/bin/bash
# Publish the site: saves your changes and uploads them to GitHub.
# Usage: ./publish.sh "short note about what changed"
cd "$(dirname "$0")" || exit 1
git pull --rebase || { echo "Pull failed. Fix the issue above, then run this again."; exit 1; }
git add -A
if git commit -m "${1:-Update site}"; then
  :
else
  echo "No new commit (working tree may already be clean)."
fi
git push || { echo "Push failed. See the message above."; exit 1; }
SHA=$(git rev-parse --short HEAD)
echo "Pushed $SHA"
echo "Open a fresh view (bypass cache):"
echo "  https://insyncrunning.com/?v=$SHA"
echo "Or hard-refresh: Cmd+Shift+R"
