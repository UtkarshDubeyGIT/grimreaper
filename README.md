<img width="1536" height="720" alt="image" src="https://github.com/user-attachments/assets/46d10dc1-af99-4bed-bd3d-eb096b75ffd6" />

# GrimReaper

GrimReaper stress-tests submitted apps with AI-driven browser personas, stores realtime state in Convex, serves the public UI through Cloudflare, and runs expensive browser/Hermes work on a DigitalOcean VM.

## Current Slice

- Vite + React scan console with demo-mode fallback.
- Cloudflare Worker `/api/scan` validation endpoint.
- Convex schema, scan queue mutations, result queries, leaderboard query, and Dodo webhook persistence.
- DigitalOcean runner skeleton with Convex claim/heartbeat/complete protocol and lightweight fallback scanner.
- Local tests for shared contracts, Worker parsing, UI state mapping, and runner config/persona planning.

## Local Setup

```bash
npm install
npm test
npm run build
npm run dev
```

Without `VITE_CONVEX_URL`, the UI runs in demo mode. Copy `.env.example` to `.env.local` to connect the real Worker and Convex deployment. See [Environment Variables](docs/environment-variables.md) for every file, value, and production location.

## Convex

```bash
npx convex dev
```

Set `CONVEX_RUNNER_TOKEN` in Convex environment variables before running the DigitalOcean worker. The runner passes the same token when claiming and completing scans.

## Cloudflare Worker

```bash
npx wrangler deploy
```

Configure Worker secrets/vars from `.env.example`. Cloudflare rate limiting and bot protection should be enabled outside the code path for public launch.

## DigitalOcean Runner

The runner can be launched directly:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r services/runner/requirements.txt
pip install "git+https://github.com/NousResearch/hermes-agent.git"
PYTHONPATH=services/runner/src python -m grimreaper_runner.main
```

For a VM deployment, copy `services/runner/systemd/grimreaper-runner.service` to systemd and store secrets in `/etc/grimreaper/runner.env`. Do not commit real API keys or VM credentials.
