#!/bin/bash
# usage: .rebuild-preview.sh <slug>   (the Mac shell cannot delete, so the old preview folder is moved aside)
cd "$(dirname "$0")"; slug=$1
mkdir -p .trash-preview; [ -d sites/$slug/preview ] && mv sites/$slug/preview .trash-preview/p$(date +%s%N)
npm run preview-file -- $slug >/tmp/prev.log 2>&1; grep -E "Content check|error|Error" /tmp/prev.log | grep -v EPERM | head -5
cat sites/$slug/preview/$slug-preview.html > sites/$slug/preview/copy.html && ls -la sites/$slug/preview/copy.html
