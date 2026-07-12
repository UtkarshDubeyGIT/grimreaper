# GrimReaper Agent Handoff Pack

This folder is the source of truth for agents building GrimReaper from a fresh repo.

GrimReaper stress-tests user-submitted apps with AI-driven browser personas, produces a public result page, and optionally generates an ElevenLabs voice roast. The product must ship quickly for a demo, break less under pressure, and keep Convex usage low even though the project is on Convex Starter pay-as-you-go.

## Locked Decisions

- Use `NousResearch/hermes-agent` as the behind-the-scenes orchestration engine, not just inspiration.
- Run Hermes on a DigitalOcean VM. Do not try to run Hermes or browser automation inside Cloudflare Workers.
- Use Cloudflare for the public app, Worker/API edge, rate limiting, caching, and optional R2 artifact storage.
- Use Convex as the realtime source of truth: scan records, queue state, leaderboard, payment state, result records.
- Use OpenAI API for agent reasoning, structured verdicts, persona planning, and summaries.
- Use ElevenLabs only after the verdict is final, so abandoned or failed runs do not spend voice credits.
- Use Dodo Payments for a paid Deep Exorcism scan, but keep the free scan path independent for demo reliability.
- Use LinkUp as optional enrichment for public context around the submitted URL; LinkUp failure must not block a scan.

## Read Order

1. `architecture.md` for the production topology and scan flow.
2. `data-api-contracts.md` for Convex schema, statuses, API contracts, and runner protocol.
3. `agent-workstreams.md` for which build agent should own each subsystem.
4. `production-demo-guardrails.md` for cost, reliability, and demo constraints.

## External Sources

- Hermes repo: https://github.com/NousResearch/hermes-agent
- Convex pricing: https://www.convex.dev/pricing
- Convex limits: https://docs.convex.dev/production/state/limits
- Convex HTTP actions: https://docs.convex.dev/functions/http-actions
- ElevenLabs text-to-speech: https://elevenlabs.io/docs/api-reference/text-to-speech/convert
- LinkUp docs: https://docs.linkup.so/
- Dodo docs: https://docs.dodopayments.com/

## Non-Goals For Demo

- Do not build a full generic QA platform.
- Do not store raw browser traces in Convex.
- Do not make signup mandatory before the first scan.
- Do not make Dodo payment required for the free scan loop.
- Do not block result generation on LinkUp or ElevenLabs.
- Do not introduce a second database.

## Current Repo State

At the time this pack was created, `/Users/dubeysmac/Documents/grimreaper` was a fresh Git repo with no app implementation files. Treat this as a greenfield build guided by the decisions above.
