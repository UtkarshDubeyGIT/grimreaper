# Environment Variables

Real secrets are intentionally excluded from Git. Fill the ignored local files,
then enter the equivalent production values in each hosting service.

## File Locations

| Runtime | Local file | Production location |
| --- | --- | --- |
| React/Vite frontend | `/.env.local` | Cloudflare Pages environment variables |
| Cloudflare Worker | `/.dev.vars` | Worker settings or `wrangler secret put` |
| Convex functions | No local secret file | Convex dashboard or `npx convex env set` |
| DigitalOcean runner | `/services/runner/runner.env` | `/etc/grimreaper/runner.env` on the VM |

The committed templates are `/.env.example`, `/.dev.vars.example`, and
`/services/runner/runner.env.example`.

## Values You Need To Add

### Frontend: `/.env.local`

- `VITE_CONVEX_URL`: the public deployment URL from Convex.
- `VITE_EDGE_API_BASE`: the public URL assigned after deploying the Cloudflare Worker.

Both values are public browser configuration. Never put API keys in a variable
whose name starts with `VITE_`.

### Cloudflare Worker: `/.dev.vars`

- `CONVEX_URL`: the same public Convex deployment URL.
- `SCANS_ENABLED`: keep `true`; set `false` to stop new scans.
- `ALLOWLIST_ONLY`: keep `false` for public access or set `true` for a controlled demo.
- `ALLOWLIST_HOSTS`: comma-separated hostnames when allowlist mode is enabled.

For production, set `CONVEX_URL` with:

```bash
npx wrangler secret put CONVEX_URL
```

The kill-switch and allowlist values are non-secret settings already declared in
`wrangler.toml`; add `ALLOWLIST_HOSTS` there or in the Cloudflare dashboard when needed.

### Convex Hosted Environment

- `CONVEX_RUNNER_TOKEN`: required secret shared only with the DigitalOcean runner.

Generate and set it once:

```bash
openssl rand -hex 32
npx convex env set CONVEX_RUNNER_TOKEN "paste-generated-value-here"
```

Paste the exact same generated value into `CONVEX_RUNNER_TOKEN` in the VM runner
environment. Do not put it in the frontend or Worker environment.

### DigitalOcean: `/etc/grimreaper/runner.env`

- `CONVEX_URL`: required public Convex deployment URL.
- `CONVEX_RUNNER_TOKEN`: required secret matching the Convex value exactly.
- `OPENAI_API_KEY`: required for Hermes AI scans.
- `LINKUP_API_KEY`: optional; set `LINKUP_ENABLED=true` only after adding it.
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`: optional; set
  `ELEVENLABS_ENABLED=true` only after adding both.
- Runner timing, identity, and concurrency settings can keep their supplied defaults.

Install the prepared runner file on the VM with owner-only permissions:

```bash
sudo install -m 600 services/runner/runner.env /etc/grimreaper/runner.env
```

The VM SSH host (`142.93.222.253`), username, password, and private-key path are
deployment credentials, not application environment variables. Keep them outside
the repository.

## Dodo Payments

`DODO_ENABLED` should remain `false` for now. Payment webhook persistence exists,
but checkout credentials and webhook signature verification are not wired into the
current slice yet. Do not add a live Dodo secret until that verification is implemented.
