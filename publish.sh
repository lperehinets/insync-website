#!/bin/bash
# Publish the site: saves your changes and uploads them to GitHub.
# Usage: ./publish.sh "short note about what changed"
cd "$(dirname "$0")" || exit 1
git pull --rebase || { echo "Pull failed. Fix the issue above, then run this again."; exit 1; }
git add -A
git commit -m "${1:-Update site}" || echo "No changes to commit."
git push || { echo "Push failed. See the message above."; exit 1; }
echo "Done. The live site updates in a minute or two."
