#!/bin/sh
# Run by a systemd timer on the worker's server every 5 minutes (docs/plan-worker-on-server.md, option A): pulls main and
# rebuilds the worker only when files it uses changed (not the sites, the onboarding or the docs). The old worker
# finishes its jobs before the new one starts (worker/compose.yaml, stop_grace_period).
cd /opt/guest-guides || exit 1
old=$(git rev-parse HEAD)
git fetch -q origin main && git merge -q --ff-only origin/main || exit 1
git diff --quiet "$old" HEAD -- . ':!sites' ':!onboarding-site' ':!onboarding' ':!docs' || docker compose -f worker/compose.yaml up -d --build
