# Deployment Notes

## Required Accounts

- Convex deployment URL and deploy key.
- Cloudflare account for Pages, Worker, rate limiting, and optional R2.
- DigitalOcean VM with Python, Chromium, Hermes dependencies, and systemd or Docker.
- OpenAI API key.
- Optional LinkUp, ElevenLabs, and Dodo credentials.

## DigitalOcean VM Bootstrap

```bash
sudo useradd --system --create-home --shell /usr/sbin/nologin grimreaper
sudo mkdir -p /opt/grimreaper /etc/grimreaper
sudo chown -R grimreaper:grimreaper /opt/grimreaper
```

Clone the repository into `/opt/grimreaper`, create a Python virtualenv, install `services/runner/requirements.txt`, then install Hermes from `NousResearch/hermes-agent`.

Create `/etc/grimreaper/runner.env` from `services/runner/runner.env.example` with real values. The complete environment reference is in `docs/environment-variables.md`:

```text
CONVEX_URL=
CONVEX_RUNNER_TOKEN=
OPENAI_API_KEY=
RUNNER_ID=grimreaper-do-1
RUNNER_CONCURRENCY=2
```

Install and start the service:

```bash
sudo cp services/runner/systemd/grimreaper-runner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now grimreaper-runner
sudo journalctl -u grimreaper-runner -f
```

## Secrets Needed From You

- GitHub push access for `UtkarshDubeyGIT/grimreaper`.
- DigitalOcean VM host, username, SSH key or password, and sudo expectations.
- Convex deployment URL plus deploy credentials.
- Cloudflare account/deploy token if you want me to deploy Pages/Worker.
- OpenAI API key and optional ElevenLabs, LinkUp, Dodo, and R2 credentials.
