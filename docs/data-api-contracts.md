# Data And API Contracts

## Scan Status Model

`scanRuns.status` must follow this state machine:

```text
queued -> claiming -> running -> finalizing -> completed
queued -> claiming -> running -> failed
queued -> cancelled
running -> cancelled
```

Use `claiming` as a short-lived lock state when the runner claims work. If a runner dies, a cleanup job may move stale `claiming` or `running` scans back to `queued` or mark them `failed`.

## Core Convex Tables

### `apps`

```ts
{
  ownerId?: Id<"users">;
  url: string;
  normalizedUrl: string;
  title?: string;
  createdAt: number;
}
```

Indexes:

- `by_normalizedUrl`
- `by_createdAt`

### `scanRuns`

```ts
{
  appId: Id<"apps">;
  mode: "landing" | "signup" | "dashboard" | "chaos";
  tier: "free" | "deep";
  status: "queued" | "claiming" | "running" | "finalizing" | "completed" | "failed" | "cancelled";
  result?: "dead" | "survived";
  publicSlug?: string;
  survivedUsers: number;
  maxUsers: number;
  score?: number;
  causeOfDeath?: string;
  fatalRoute?: string;
  severity?: "minor" | "embarrassing" | "critical" | "apocalyptic";
  currentStage?: string;
  runnerId?: string;
  claimExpiresAt?: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}
```

Indexes:

- `by_status_createdAt`
- `by_publicSlug`
- `by_appId_createdAt`
- `by_result_score`

### `personaRuns`

```ts
{
  scanRunId: Id<"scanRuns">;
  personaName: string;
  task: string;
  status: "queued" | "running" | "success" | "failed" | "skipped";
  summary?: string;
  failureReason?: string;
  route?: string;
  artifactUrls?: string[];
  consoleErrorCount?: number;
  createdAt: number;
  updatedAt: number;
}
```

Indexes:

- `by_scanRunId`

### `deathCertificates`

```ts
{
  scanRunId: Id<"scanRuns">;
  publicSlug: string;
  verdictText: string;
  roastText: string;
  fixSuggestions: string[];
  audioUrl?: string;
  shareImageUrl?: string;
  createdAt: number;
}
```

Indexes:

- `by_publicSlug`
- `by_scanRunId`

### `payments`

```ts
{
  userId?: Id<"users">;
  scanRunId?: Id<"scanRuns">;
  provider: "dodo";
  providerSessionId: string;
  status: "created" | "paid" | "failed" | "refunded";
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}
```

Indexes:

- `by_providerSessionId`
- `by_scanRunId`

## Convex Public Functions

**Mutations**

- `submitScan({ url, mode, tier? })`: validates, normalizes URL, creates/links app, creates queued run.
- `claimNextScan({ runnerId })`: atomically claims one queued run and returns scan payload.
- `heartbeatScan({ scanRunId, runnerId, stage })`: extends claim and updates coarse progress.
- `upsertPersonaResult({ scanRunId, persona })`: creates or updates one bounded persona summary.
- `completeScan({ scanRunId, runnerId, result })`: writes final result and certificate fields.
- `failScan({ scanRunId, runnerId, errorMessage })`: marks run failed with a user-safe message.
- `recordDodoWebhook({ event })`: verifies and records payment state.

**Queries**

- `getRun({ scanRunId })`
- `getPublicResult({ publicSlug })`
- `getLeaderboard({ mode?, limit })`
- `getRecentRuns({ limit })`

**HTTP Actions**

- `POST /api/dodo/webhook`: Dodo webhook receiver.
- `POST /api/runner/event`: optional runner event endpoint if not using direct Convex client.

Prefer the Convex client from the DO runner for claim/heartbeat/complete. Use HTTP actions for third-party webhooks.

## Runner Claim Protocol

The runner loop:

1. Call `claimNextScan({ runnerId })`.
2. If no job is returned, sleep with jitter.
3. If a job is returned, run Hermes orchestration.
4. Heartbeat every `10-15s`.
5. Write persona summaries only when each persona finishes.
6. Complete or fail the scan exactly once.

Claim behavior:

- Query oldest `queued` scan by `by_status_createdAt`.
- Patch status to `claiming`, `runnerId`, and `claimExpiresAt`.
- Return job payload.
- Runner immediately moves it to `running` on start.

## Artifact Contract

Artifacts must be stored outside Convex DB:

```ts
{
  type: "screenshot" | "audio" | "shareImage" | "report";
  url: string;
  contentType: string;
  byteSize?: number;
  createdAt: number;
}
```

Convex stores only `url`, `type`, and small metadata. Do not put raw screenshots, audio bytes, HTML snapshots, or full browser traces into Convex documents.

## Environment Variables

Cloudflare:

```text
CONVEX_URL
CONVEX_DEPLOY_KEY
DODO_API_KEY
DODO_WEBHOOK_SECRET
PUBLIC_APP_URL
```

DigitalOcean runner:

```text
CONVEX_URL
CONVEX_RUNNER_TOKEN
OPENAI_API_KEY
ELEVENLABS_API_KEY
ELEVENLABS_VOICE_ID
LINKUP_API_KEY
ARTIFACT_STORAGE_PROVIDER
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
RUNNER_ID
RUNNER_CONCURRENCY
```

Never commit real secrets. Use placeholder names only.
