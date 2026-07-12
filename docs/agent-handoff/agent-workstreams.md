# Agent Workstreams

Use these workstreams to split implementation across agents. Each agent should read `README.md`, `architecture.md`, `data-api-contracts.md`, and `production-demo-guardrails.md` before making changes.

## 1. Product UI Agent

Mission: build the user-facing Cloudflare app.

Deliverables:

- URL input and scan mode selector.
- Active scan progress page backed by Convex realtime query.
- Public death certificate and survival badge pages.
- Leaderboard.
- Challenge CTA that starts a new scan.

Acceptance:

- A user can submit a URL without signing up.
- A queued/running/completed scan updates without manual refresh.
- Public result pages are shareable by slug.
- UI still works when audio is missing.

## 2. Convex Backend Agent

Mission: implement schema, queries, mutations, and webhook endpoints.

Deliverables:

- Tables and indexes from `data-api-contracts.md`.
- `submitScan`, `claimNextScan`, `heartbeatScan`, `upsertPersonaResult`, `completeScan`, `failScan`.
- Public result and leaderboard queries.
- Dodo webhook HTTP action.

Acceptance:

- Runner cannot claim the same scan twice.
- Queries use indexes and bounded limits.
- No large artifacts are stored in Convex DB.
- Failed provider calls can be represented without breaking result pages.

## 3. Hermes Runner Agent

Mission: build the DigitalOcean runner service around Hermes.

Deliverables:

- Python service that polls Convex, claims scans, heartbeats, and completes/fails scans.
- Hermes install/bootstrap path from `NousResearch/hermes-agent`.
- Manager prompt and scan plan prompt.
- Persona delegation using Hermes subagents.
- Local browser backend setup using Hermes browser tooling.

Acceptance:

- Runner can process a free scan end to end with one process.
- Runner exits cleanly and does not leave browser sessions hanging.
- Runner respects configured concurrency and timeouts.
- Runner writes bounded summaries, not raw traces.

## 4. Scan Intelligence Agent

Mission: define the scan logic and result quality.

Deliverables:

- Scan modes: `landing`, `signup`, `dashboard`, `chaos`.
- Persona task templates for free and deep scans.
- Structured result schema for failure classification.
- Verdict and fix-suggestion prompts.
- Fallback lightweight inspection when browser automation fails.

Acceptance:

- Failure reasons mention route/action/evidence.
- Verdict is funny but useful and roasts the app, not the builder.
- Result never claims evidence that was not collected.
- Free scan finishes in `60-90s` under normal conditions.

## 5. Payments Agent

Mission: integrate Dodo for paid deep scans without blocking the free loop.

Deliverables:

- Deep scan product configuration assumptions.
- Checkout creation endpoint.
- Webhook verification and payment status update.
- Entitlement check that upgrades max personas/timeouts.

Acceptance:

- Free scans work if Dodo is disabled.
- Paid scan starts only after confirmed payment or demo override.
- Payment metadata includes `scanRunId` or a stable correlation ID.
- Webhook replay is idempotent.

## 6. Voice And Artifacts Agent

Mission: generate and store audio/screenshots/share assets.

Deliverables:

- ElevenLabs text-to-speech call after final verdict.
- Artifact uploader to R2 or DO Spaces.
- Share image generation if time allows.
- Artifact metadata attached to certificate/result.

Acceptance:

- Audio generation failure leaves a completed text result.
- Artifacts are stored outside Convex DB.
- Public URLs or signed URLs render from the result page.
- Screenshot count respects tier limits.

## 7. Cloudflare Deployment Agent

Mission: make the product publicly deployable and protected.

Deliverables:

- Cloudflare Pages/Worker deployment config.
- Environment variable wiring.
- Rate limiting or Turnstile gate for scan submission.
- Cache rules for public result pages.

Acceptance:

- App deploys to a public URL.
- Public result pages are crawlable/shareable.
- Scan submission endpoint rejects malformed URLs and excessive anonymous usage.
- Cloudflare does not proxy long-running Hermes work synchronously.

## 8. QA And Demo Agent

Mission: prove the demo loop and prepare backup paths.

Deliverables:

- Test matrix for dead app, surviving app, provider failure, and paid entitlement.
- Seed/demo URLs.
- Demo script and fallback recorded flow.
- Budget/cap verification.

Acceptance:

- At least one complete run produces a death certificate.
- At least one complete run produces a survival badge.
- Leaderboard updates after completed scans.
- Demo still works if ElevenLabs or LinkUp is temporarily disabled.

## Build Order

1. Convex Backend Agent.
2. Product UI Agent with mocked runner states.
3. Hermes Runner Agent with one simple scan.
4. Scan Intelligence Agent improves outputs.
5. Voice And Artifacts Agent.
6. Payments Agent.
7. Cloudflare Deployment Agent.
8. QA And Demo Agent.
