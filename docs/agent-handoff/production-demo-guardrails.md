# Production And Demo Guardrails

## Operating Goal

Ship a public demo fast, keep the free scan loop reliable, and avoid unnecessary Convex usage. The project is on Convex Starter pay-as-you-go, so overages are acceptable but waste is still a design bug.

## Demo Defaults

Use environment-configured limits:

```text
FREE_SCAN_PERSONAS=5
FREE_SCAN_TIMEOUT_SECONDS=90
FREE_SCAN_MAX_SCREENSHOTS=2
DEEP_SCAN_PERSONAS=25
DEEP_SCAN_TIMEOUT_SECONDS=300
DEEP_SCAN_MAX_SCREENSHOTS=10
RUNNER_CONCURRENCY=2
MAX_PENDING_SCANS=50
PROGRESS_WRITE_INTERVAL_MS=5000
RUNNER_HEARTBEAT_INTERVAL_MS=10000
ANON_SCAN_LIMIT_PER_IP_PER_DAY=1
```

These are defaults, not product promises. Keep them in config so the demo operator can raise or lower them without code changes.

## Convex Usage Rules

- Store state, summaries, and URLs only.
- Do not store raw browser traces, full HTML, screenshots, audio bytes, or verbose logs.
- Write progress at stage changes or every `5s`, whichever is less frequent.
- Write one `personaRuns` summary per persona, not every click.
- Keep leaderboard queries indexed and bounded to `50` rows.
- Keep public result queries by `publicSlug`.
- Avoid Convex actions for long-running scan work; run that work on DigitalOcean.

## DigitalOcean Runner Rules

- Start with one VM and one service process.
- Use `RUNNER_CONCURRENCY=2` for demo stability.
- Install Hermes and browser dependencies during deployment, not during scan execution.
- Prefer local headless Chromium through Hermes/agent-browser for deterministic demo behavior.
- Use per-scan temp directories and clean them after upload/finalization.
- Always call `failScan` with a user-safe message if a scan cannot complete.

## Provider Degradation

**OpenAI**

- If classifier generation fails, use deterministic fallback from collected evidence.
- If persona generation fails, use static persona templates.

**LinkUp**

- If unavailable, continue with submitted URL only.
- Never block browser testing on LinkUp.

**ElevenLabs**

- Generate audio only after final verdict text is saved.
- If unavailable, set audio status to failed and keep the text certificate public.

**Dodo Payments**

- Keep Dodo disabled behind a feature flag until webhook flow is verified.
- Free scans must not depend on Dodo.
- Use a demo override for paid tier if checkout is unstable during presentation.

## Abuse And Safety

- Validate URLs server-side.
- Block localhost, private IP ranges, metadata IPs, and non-HTTP protocols.
- Apply Cloudflare bot/rate protection before creating Convex scan records.
- Add an allowlist mode for live demos.
- Keep roasts about the app, not the person or company.
- Do not test destructive flows in submitted apps.
- Do not enter real payment credentials into third-party apps during scans.

## Demo Readiness Checklist

- One known weak demo URL produces a death certificate.
- One known stable URL produces a survival badge.
- Leaderboard updates after completed scans.
- Public slug pages render from a clean browser session.
- Audio button works for at least one result.
- Audio-missing result still looks intentional.
- Runner restart does not permanently strand queued scans.
- Convex dashboard shows bounded document growth.
- Cloudflare deployment URL is final before recording demo.

## Budget Monitoring

Watch these during demo week:

- Convex function call count.
- Convex DB storage growth.
- Convex file storage and egress if using Convex storage for any temporary fallback.
- OpenAI request count and model spend.
- ElevenLabs character usage.
- DigitalOcean CPU, memory, and disk.
- Artifact bucket size and public egress.

## Kill Switches

Implement these config flags before public posting:

```text
SCANS_ENABLED=true
LINKUP_ENABLED=true
ELEVENLABS_ENABLED=true
DODO_ENABLED=false
DEEP_SCANS_ENABLED=false
ALLOWLIST_ONLY=false
MAX_GLOBAL_RUNNING_SCANS=2
```

If the demo starts failing under load, disable new scans while keeping result pages online.
