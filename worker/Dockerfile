# The guide worker on a small always-on server (docs/plan-worker-on-server.md). Build from the repo folder:
#   docker build -f worker/Dockerfile -t guide-worker .
# No keys in the image: they come from the server's environment (an env file outside the repo, or the host's secrets).
# Research and translation use the Claude API (RESEARCH=api, key WORKER_ANTHROPIC_KEY), never the `claude` command.
FROM node:22-bookworm-slim

# Python 3 with the generator's packages (engine/scripts/generate-site.py), the same versions as on Yohann's Mac, and
# Overture's reader for a place's facts (worker/overture.py; pyarrow as overturemaps 2.1.0 resolved it on 10 Nov 2026).
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/py && /opt/py/bin/pip install --no-cache-dir pillow==11.3.0 numpy==2.0.2 segno==1.6.6 overturemaps==2.1.0 pyarrow==26.0.1
ENV PATH=/opt/py/bin:$PATH NODE_ENV=production RESEARCH=api

WORKDIR /app
RUN chown node:node /app
USER node
# Overture's places around each house are kept here (worker/overture.py); made now so the volume that worker/compose.yaml
# mounts on it belongs to node and survives an update.
RUN mkdir -p /home/node/.cache/guest-guides
# The engine's packages without the build tools (the generator copies fonts from node_modules/@fontsource), then the
# worker's own (the Claude SDK). Copied first, so a code change does not reinstall them.
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node worker/package.json worker/package-lock.json worker/
RUN npm ci --prefix worker --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node . .

# A stop (update, restart) sends SIGTERM: the worker finishes what is running first, so give it up to 15 minutes
# (docker run --stop-timeout 900, or stop_grace_period in worker/compose.yaml).
STOPSIGNAL SIGTERM
CMD ["node", "worker/guide-worker.mjs"]
