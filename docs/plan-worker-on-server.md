# Plan: nothing on the Mac: the guide worker on a small server, the monthly check in the cloud (decided 28 Oct 2026)

Status: decided (see "Decided by Yohann"), code ready, setup starting. `RESEARCH=api` (worker/claude-api.mjs), `worker/Dockerfile`, `worker/compose.yaml`, `worker/server-update.sh` and `.dockerignore` are in the repo and tested locally against a stand-in for the Claude API. Nothing is deployed and no account is created: Yohann chooses the provider, creates the server account and the Claude API key, and sets the budget (end of this page). Widened the same day at Yohann's request ("What if we did it all in the cloud?"): the monthly check and everything else that needs the Mac on are in scope too.

## Decided by Yohann (28 Oct 2026)
1. Provider: Hetzner Cloud, CX23 in Germany (option A).
2. Claude API key: in the Console's default workspace for now (demo stage). Move it to its own workspace when the first real host signs up, or when Claude spending passes about 20 USD a month and the worker's share must show apart.
3. Budget: a 50 USD monthly spend limit in the Console (it covers the whole organisation, the onboarding's key too) and `RESEARCH_USD_PER_DAY=5` in the worker.
4. Models: research on Opus 5.5 (`RESEARCH_MODEL`, default), translation on Haiku 5.5 (`TRANSLATE_MODEL`, now the default). The first real translations get checked for the typography rules (French no-break spaces, German and Dutch soft hyphens).
5. When: now, with help for the setup.
6. Monthly check-guides: applies its fixes by itself from the first month; the report still goes to Yohann.
7. The research for the lines "for a human": a scheduled Claude Code routine in Anthropic's cloud (needs the project notes in a private GitHub repository and keys in its environment).
8. The monthly report: by email through Resend's free plan, to Yohann's address.

## Why
- The worker (`worker/guide-worker.mjs`) runs on Yohann's MacBook Air, started at login by the launch agent `com.guestguides.worker` (`sh worker/autostart.sh`, log in ~/Library/Logs/guide-worker.log). When the Mac sleeps or is off, guides stay "queued" and the editor's jobs (Find more, translate, automatic events, artistic covers) never start. The 19 Oct plan (`plan-accounts-and-publishing.md`, "Interim model") already says to move it before the first real host.
- Research and translation use the `claude` command logged in with Yohann's own account: a personal login doing a business service's work, no bill of its own, no spending limit, and it cannot run on a server without storing his login there.

## Everything that only runs while the Mac is on (28 Oct 2026)
| What | Today, on the Mac | In the cloud | When |
|---|---|---|---|
| Guide worker: builds, translate, Find more, automatic events on demand, artistic covers | launch agent `com.guestguides.worker` (`worker/autostart.sh`, `caffeinate`), the `claude` command for research | the server (option A below), Docker, the Claude API | switch day (Steps 4) |
| Monthly check, scripts: `check-guides --apply`, `refresh-events --apply` | the scheduled task "Monthly check of every live guide" (Claude desktop app, id live-guides-monthly-check, 1st of the month 9:00), the `claude` command | a monthly timer on the same server, the Claude API | the first 1st of the month after the switch |
| Monthly check, judgment: the lines "for a human" (official sources), events that look wrong, the summary for Yohann | the same task: a Claude session reads the reports and searches | the server emails the reports; a Claude Code routine scheduled in Anthropic's cloud does the research (or a cloud session Yohann starts when a report needs it) | the same month, or the next |
| Monthly check, part B: new places for Ca La Kimberly | the same task | the server queues a Find more search for Ca La Kimberly; the suggestions wait 14 days in the editor, Yohann keeps or skips each one | with the monthly timer |
| Ca La Kimberly fixes from sources (pull, edit, check, build, UX check, push, commit) | the same task, in the Mac's checkout | in the editor (the live guide is the database), or by the routine, which opens a pull request for repo files such as docs/sources.json | with the routine |
| Project notes outside the repo (../CLAUDE.md, PROJECTS.md, CHANGES.md, BACKLOG.md, GITHUB-SETUP.md) | the Google Drive folder | a cloud routine or session only sees GitHub repositories: the notes move to a private repository (Phase 2 of GITHUB-SETUP.md already asks for one), or the routine's prompt carries the few rules it needs | before the routine |
| Keys (worker/.env.local, Guest Guides/.env) | files on the Mac | the server's env file and the routine's cloud environment; the Mac keeps its own for development | switch day |
| Development sessions and pushes | Claude desktop app, GitHub Desktop | optional: Claude Code on the web or the phone (cloud sessions push branches; merging on github.com publishes) | when Yohann wants; hosts do not need it |
| Cowork task "Ca La Kimberly accuracy check" | paused | deleted | after the first good cloud month |

Already in the cloud, nothing to move: Netlify (the guides, the shared viewer, the onboarding and its functions, Day Rental), Supabase (accounts, data, photos), Google and OpenAI. Day Rental has nothing scheduled. Once the steps below are done, the Mac is only needed for development, and not even for that if Yohann works in cloud sessions.

## What the worker needs
| Need | On the Mac today | On the server |
|---|---|---|
| Node 20+ | Node 24 | Node 22 (in the image) |
| Python 3 with Pillow, NumPy, segno (`engine/scripts/generate-site.py`) | Python 3.9 | Python 3.11, same package versions (pinned in the Dockerfile) |
| The repo: engine scripts, i18n, groups and flags lists, templates, the worker; `node_modules/@fontsource` (the generator copies fonts) | the checkout | in the image (`npm ci --omit=dev`, no build tools), rebuilt after each push |
| Supabase secret key `SUPABASE_SERVICE_KEY` | worker/.env.local | the server's env file |
| Google Places key `GOOGLE_PLACES_KEY` (Find more check, host's places) | Guest Guides/.env | the server's env file; better a new key for the server, Places API (New) only, same daily caps |
| OpenAI key `OPENAI_API_KEY` (cover-art, `gpt-image-2.5-sunburst`) | worker/.env.local | the server's env file |
| Claude for research and translation (`claudeJson`, `translate`) | the `claude` command with Yohann's login, `RESEARCH=cli` | the Claude API, `RESEARCH=api`, its own key `WORKER_ANTHROPIC_KEY` |
| Network | outgoing only | outgoing only: Supabase, Anthropic, OpenAI, Google, Airbnb's image server. No open port, no domain, no certificate: the worker asks the database every 10 s. |
| Memory and disk | | image under 1 GB; 1 GB of memory is enough in api mode (no `claude` processes), 2 GB is comfortable |
| One worker only | | stop the Mac's worker before the server's starts: at start a worker puts every "running" job back in the queue, which would restart the other one's work |

## The Claude API in place of the `claude` command
What changed in the code (on the Mac nothing changes while `RESEARCH=cli`):
- `claudeAsk()` in guide-worker.mjs sends each question either to the `claude` command or, with `RESEARCH=api`, to `worker/claude-api.mjs`. Same prompts, same JSON reading, same curation and Google rules.
- Requests: research on `claude-opus-5-5` (`RESEARCH_MODEL`), translation on `claude-haiku-5-5` (`TRANSLATE_MODEL`), effort `medium` (`RESEARCH_EFFORT`; this model always thinks, effort sets how much), streaming. Research gets Anthropic's web search (`web_search_20260318`, which filters results with code before they reach Claude) and web fetch (`web_fetch_20260209`, pages cut at 30,000 tokens), each at most 20 uses per request (`RESEARCH_MAX_SEARCHES`). A long research comes back paused after Anthropic's own loop of steps; the worker sends it back as it is, up to 5 times. Server-side fallback (`fallbacks: "default"`, beta header `server-side-fallback-2026-07-01`): if the model's safety checks decline a request, another model answers inside the same call. Automatic prompt caching makes the continuations cheaper.
- Errors: the API's own words go to the log only. Hosts see "Searches are paused for now. Try again later." (key, permission, billing, bad request) or "The search did not work this time. Try again in a few minutes." (overload, rate limit, network, after 3 retries). A translation that fails no longer throws a paid search away: the suggestions come back untranslated, as when the `claude` command fails.
- Settings with their own names (`WORKER_ANTHROPIC_KEY`, `RESEARCH_*`, `TRANSLATE_MODEL`): Claude Code sets `ANTHROPIC_BASE_URL`, `CLAUDE_EFFORT` and others inside its sessions (the monthly task runs in one), and an `ANTHROPIC_API_KEY` meant for something else must not be picked up.
- `node worker/guide-worker.mjs --find find-todo --slug <slug>`: one Find more search for a guide, printed and written nowhere, safe next to a running worker. It is how to test a new key, model or server.
- Also for the server: a stop by SIGTERM (update, restart) takes nothing new and lets running jobs and a build finish; `HEARTBEAT_URL` is pinged once a minute so a monitor can warn when the worker stops.

Budget, in three layers:
1. Its own key in its own workspace of the Claude Console (for example "guide-worker"), so its usage shows apart. A monthly spend limit on the organisation (Console > Settings > Limits; it also covers the key the onboarding uses for /api/listing, if it is the same organisation), and on the workspace too where the Console offers it.
2. `RESEARCH_USD_PER_DAY` in the worker (default 5 USD): from the usage of each answer the worker adds up the day's expected cost and stops asking Claude past it until the next day (UTC). The count starts again when the worker restarts, so the Console limit is the real ceiling. Hosts see "Searches are paused for today. Try again tomorrow."
3. Already there: at most 8 searches (Find more and automatic events) and 8 covers per guide a day.

Expected cost (list prices, Oct 2026: Opus 5.5 4 USD per million tokens in, 20 out, cache reads 0.20; Sonnet 5.5 2 and 10; Haiku 5.5 0.10 and 0.50; web search 10 USD per 1,000 searches; web fetch only its tokens). Each call logs its real numbers, so the first real search replaces these guesses:
- one Find more search (10 to 20 searches, a few pages, mostly input tokens): expected 0.30 to 1.50 USD on Opus 5.5, about half on Sonnet 5.5;
- translating 10 suggestions into 5 languages: expected under 0.10 USD on Opus 5.5, under 0.01 on Haiku 5.5;
- a first build with research (markets, things to do, emergency, translation): expected 1 to 4 USD;
- automatic events (one general search and up to three topic searches): expected 1 to 5 USD per guide a month;
- the test phase with a handful of guides: expected 10 to 40 USD a month.

Rate limits: a new organisation starts at a low usage tier with low tokens-per-minute limits; three jobs side by side (an events search runs up to four searches at once) may hit them. The SDK waits and retries; after that the host sees "did not work this time". The tier rises with credit purchases (the Console's Limits page shows it).

Data: the prompts carry the house's area (town and the approximate point, already offset), the host's tastes and, for translation, the guide's own texts; never Wi-Fi, emails or answers as a whole. The Claude API processes them outside the EU (as the `claude` command does today). The privacy notice must name Anthropic, OpenAI, Google and the server's host as processors before real hosts.

Why not keep the `claude` command on a server: Yohann's personal login would live on the server (his whole account if the server leaks), a personal subscription would do a business service's work, there is no spend limit of its own, and when the login expires someone must log in again by hand.

## Where: three options in the EU
| | A. Hetzner Cloud (VPS) | B. Scaleway (VPS) | C. Fly.io (container host) |
|---|---|---|---|
| Company, place | German; Nuremberg, Falkenstein or Helsinki | French; Paris or Amsterdam | American, EU regions (Frankfurt, Paris, Amsterdam) |
| Size | CX23: 2 vCPU, 4 GB, 40 GB | DEV1-S: 2 vCPU, 2 GB | shared-cpu-1x, 1 GB |
| Expected cost a month | about 4 EUR plus 0.50 EUR for the IPv4 address | about 6.55 EUR plus about 2.90 EUR IPv4 plus storage | about 5.70 USD |
| Keys | `/etc/guide-worker.env`, root only | the same | `fly secrets set`, encrypted at Fly |
| Logs | `docker compose logs`, 5 files of 10 MB on the server | the same | `fly logs`, short history |
| Restarts | Docker `restart: unless-stopped` | the same | Fly's restart policy |
| Updates on each push | the server pulls `main` every 5 minutes | the same | `fly deploy` by hand, or a GitHub Action holding a Fly token |

Prices are expected (third-party comparisons and the providers' pages, Oct 2026; check the provider's own page before buying). Hetzner raised its prices in April 2026, and its cheapest CX line is sometimes shown "currently not available": then CAX11 (Arm, the image builds for Arm too) or CPX22 (about 8 EUR). Scaleway's STARDUST1-S (1 vCPU, 1 GB) costs much less but is often out of stock. Fly's prices vary by region.

### A. Hetzner Cloud: setup
1. Yohann: a Hetzner account, a project "guest-guides", his SSH public key. Server: Ubuntu 24.04, location Germany, a firewall that only lets SSH in. No backups needed (nothing lives on the server).
2. On the server: `apt update && apt full-upgrade`, `apt install unattended-upgrades` (security updates by themselves), Docker Engine with the compose plugin from Docker's own apt repository.
3. `git clone https://github.com/ybensadoun/guest-guides /opt/guest-guides` (public: no GitHub credentials on the server).
4. Keys: Yohann types them into `/etc/guide-worker.env` over SSH (never in chat, the repo or GitHub), then `chmod 600`:
   `SUPABASE_SERVICE_KEY=`, `GOOGLE_PLACES_KEY=`, `OPENAI_API_KEY=`, `WORKER_ANTHROPIC_KEY=`, `RESEARCH_USD_PER_DAY=5`, `HEARTBEAT_URL=` (optional), later `RESEND_API_KEY=` (monthly report).
5. Switch, in a quiet hour: on the Mac `sh worker/autostart.sh remove` (stops the launch agent and takes it out, so it does not start again at the next login), then on the server `cd /opt/guest-guides && docker compose -f worker/compose.yaml up -d --build`. Check: `docker compose -f worker/compose.yaml logs -f` shows "Research: api"; a Find more search from the editor ends with suggestions and a cost line in the log.
6. Updates on each push: a systemd timer runs `worker/server-update.sh` every 5 minutes. It rebuilds only when files the worker uses changed (not sites/, onboarding-site/, docs/); the old worker finishes its jobs first (up to 15 minutes, new jobs wait meanwhile). No GitHub secret and no way in: the server pulls from the public repo. `/etc/systemd/system/guide-worker-update.service`:
   ```ini
   [Service]
   Type=oneshot
   ExecStart=/opt/guest-guides/worker/server-update.sh
   ```
   and `/etc/systemd/system/guide-worker-update.timer`:
   ```ini
   [Timer]
   OnBootSec=2min
   OnUnitActiveSec=5min
   [Install]
   WantedBy=timers.target
   ```
   then `systemctl enable --now guide-worker-update.timer`. `journalctl -u guide-worker-update` shows each update.
7. Monitoring: a free check at a monitoring service (for example Healthchecks.io) whose ping address goes in `HEARTBEAT_URL`; it emails when the pings stop for 10 minutes.

### B. Scaleway: setup
The same as A (Docker, env file, compose, timer) on a DEV1-S. Equivalent, about twice the price for half the memory. Scaleway's serverless containers do not fit: they run on requests or schedules, and the worker asks the database every 10 seconds.

### C. Fly.io: setup
1. Yohann: a Fly account (card needed) and `flyctl` on the Mac.
2. A `fly.toml` with the region (`fra`), `[build] dockerfile = "worker/Dockerfile"`, no `[http_service]` (nothing to serve), one machine with 1 GB; `fly secrets set` for the keys; `fly deploy`.
3. Updates: `fly deploy` from the Mac after a push, or a GitHub Action with a `FLY_API_TOKEN` secret. That Action's log is public (the repo is public) but only shows the image build, never host data or keys.
4. Fly lets a stop wait only a few minutes (`kill_timeout`), so a long events search can be cut by an update and starts again from the beginning (paid twice).
Simpler if Yohann never wants to touch a Linux server; otherwise one more account, a token in GitHub or a manual step, short logs, and a little dearer than A.

## The monthly check in the cloud
Today it is one Claude session on the Mac (`~/.claude/scheduled-tasks/live-guides-monthly-check/SKILL.md`): check-guides as a dry run, read, apply; refresh-events; research for the lines "for a human"; Ca La Kimberly's fixes, build, UX check, push to the database, commit; new places for Ca La Kimberly; a summary. In the cloud it splits into what a script does and what needs judgment.

1. On the server, a monthly systemd timer (`OnCalendar=*-*-01 09:00 Europe/Madrid`), each step a `docker compose -f worker/compose.yaml run --rm worker ...`:
   - `node worker/check-guides.mjs --apply` (decided: it applies by itself from the first month). Its rules are careful: official hours are compared, never replaced; Ca La Kimberly is report only; a doubtful answer is left for a human and goes to the routine below.
   - `RESEARCH_USD_PER_DAY=30 node worker/guide-worker.mjs --refresh-events --apply`: the Claude API; one run searches every guide with automatic events on (expected 1 to 5 USD per guide), so it gets its own, higher day limit.
   - A Find more search (things to do, markets) queued for Ca La Kimberly: the worker runs it like the editor's button, and the editor's Find more panel shows its suggestions for 14 days; Yohann keeps or skips each one and publishes as usual. Same curation rule and Google check as the task's part B, and nothing goes live without him.
   - The reports by email to Yohann (decided: Resend's free plan, one key `RESEND_API_KEY` in the env file, sent from Resend's own address to Yohann's; expected free at this volume): per guide what was fixed, added, re-dated or dropped, the lines for a human, Google requests used, Claude cost. The same report saved in the database (the `events` table) for the routine below.
   Code still to write (small): queuing the two Find more jobs, the report email, the reports saved in the database.
2. The judgment: a Claude Code routine scheduled in Anthropic's cloud on the 1st at 11:00, after the server's run, on the GitHub repo and Yohann's Claude account (like the desktop task today). It reads the saved report, looks up official sources for the lines "for a human", checks events that look wrong, makes Ca La Kimberly's fixes through `guide:pull` and `guide:push` (the live guide is the database) after the content check and the UX check, and opens a pull request for repo files (docs/sources.json); Yohann merges it from his phone. Its environment needs the Supabase key, a Google Places key of its own and Playwright's Chromium (UX check). To confirm when setting it up: how the routine's environment keeps keys, and how it reads the project notes (see the table above).
3. Once a cloud month has gone well: switch the desktop task off (Claude desktop app > Scheduled) and delete the paused Cowork task.

## The launch agent: what replaces it, and when it goes
- Since 28 Oct the worker runs on the Mac as a launch agent (`sh worker/autostart.sh install`: at login, back within 30 s if it stops, `caffeinate`, log in ~/Library/Logs/guide-worker.log, a pid guard so only one worker runs). It is the stopgap until the server.
- On the server: Docker's restart policy replaces KeepAlive, `docker compose logs` replaces the log file, `worker/server-update.sh` replaces "restart after pulling", and there is no sleep to prevent. The pid guard stays in the code: in the container it finds no other worker and does nothing, and it still protects a worker started by hand.
- Switch day: `sh worker/autostart.sh remove` on the Mac (stops it and takes it out of the login items), then the server's worker starts. Never both at once: each would put the other's running jobs back in the queue.
- Four weeks after the switch without trouble: one commit removes `worker/autostart.sh`, its part of worker/README.md ("Run") and its row in CLAUDE.md. Until then it is the fallback: if the server is down for long, stop it, then `sh worker/autostart.sh install` on the Mac.

## Why not GitHub Actions
- The repo is public, so every run's log is public. The worker's log carries guide slugs, place names and error messages that can quote host texts; Actions masks the registered secrets but not host data, so one careless log line publishes it. Phase 2 of GITHUB-SETUP.md asks to keep code and customer data apart.
- No always-on runner: a schedule runs at most every 5 minutes and often later, and each run starts cold (Node, Python and packages, about a minute), so a host on the progress screen waits minutes more. Starting one run per job (repository_dispatch from Netlify) needs a GitHub token in Netlify and a workflow per kind of job.
- Scheduled workflows of a public repo stop after 60 days without commits.
- Actions stays fine for work without host data (building the image, checks).

## Recommendation (taken)
Option A, Hetzner CX23 in Germany, with the Claude API (Opus 5.5 research, Haiku 5.5 translation), a 50 USD monthly limit and 5 USD a day, the monthly check on the server's timer with an emailed report, and a Claude Code routine for the research. Then nothing needs the Mac.
Expected total: about 5 EUR a month for the server, plus Claude API use (expected 10 to 40 USD a month in the demo stage), plus OpenAI covers (about 0.02 USD each) and Google Places as today.

## Steps
1. Yohann: Claude Console, default workspace: an API key named "guide-worker"; Settings > Limits: a 50 USD monthly spend limit. The key goes into the Mac's `worker/.env.local` as `WORKER_ANTHROPIC_KEY=` (the running worker keeps `RESEARCH=cli`).
2. First real test on the Mac, beside the running worker (Yohann's go: expected under 1.50 USD): `npm ci --prefix worker`, then `RESEARCH=api node worker/guide-worker.mjs --find find-todo --slug home-in-tordera`. Check the suggestions, their translations (typography) and the printed cost.
3. Yohann, with help: a Hetzner account, an SSH key on the Mac, the CX23 server (Ubuntu 24.04, Germany, firewall SSH only), a Google Places key for the server, a free monitoring check for `HEARTBEAT_URL`.
4. The branch merged into `main` and pushed (Yohann's go): the server runs what is on `main`.
5. Server setup and switch (A 3-7): `sh worker/autostart.sh remove` on the Mac, then the server's worker.
6. The monthly run: the small code (Ca La Kimberly's Find more jobs, the report saved in the database, the email through Resend), a Resend account (Yohann), then the monthly timer on the server.
7. The routine: the project notes into a private GitHub repository, the Claude Code routine with its keys, on the 1st at 11:00.
8. After a good cloud month: the desktop task off, the Cowork task deleted. Four weeks after the switch: `worker/autostart.sh` removed (see "The launch agent").
9. Before real hosts: delete a job's folder (worker/jobs/<id>: host answers and photos) once its guide is saved; the privacy notice names the processors; an alert on failed jobs (BACKLOG item 7); the API key in its own workspace (decision 2).
