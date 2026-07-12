import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  ExternalLink,
  Flame,
  Link as LinkIcon,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Skull,
  Trophy,
  Volume2,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { normalizeSubmittedUrl } from "../packages/shared/src/contracts.js";
import { advanceDemoRun, demoLeaderboard, makeDemoRun } from "./lib/demoData";
import { brandAssets } from "./lib/brandAssets.js";
import {
  createRealtimeClient,
  submitScan,
  subscribeToLeaderboard,
  subscribeToPublicResult,
  subscribeToRun,
} from "./lib/grimreaperClient";
import type { PersonaRunRecord, ScanBundle, ScanMode, ScanTier, SubmitScanInput } from "./lib/types";
import {
  leaderboardVerdicts,
  progressForStatus,
  publicReportView,
  resultDisplay,
  scanFormDefaults,
  statusLabel,
  targetLabel,
} from "./lib/viewModel.js";

const modes: Array<{ value: ScanMode; label: string }> = [
  { value: "landing", label: "Landing" },
  { value: "signup", label: "Signup" },
  { value: "dashboard", label: "Dashboard" },
  { value: "chaos", label: "Chaos" },
];

const tiers: Array<{ value: ScanTier; label: string; meta: string }> = [
  { value: "free", label: "Free", meta: "5 personas" },
  { value: "deep", label: "Deep", meta: "25 personas" },
];

const formDefaults = scanFormDefaults();

export default function App() {
  const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
  const edgeBase = import.meta.env.VITE_EDGE_API_BASE as string | undefined;
  const liveMode = Boolean(convexUrl || edgeBase);
  const client = useMemo(() => createRealtimeClient(convexUrl), [convexUrl]);

  const [url, setUrl] = useState(formDefaults.url);
  const [mode, setMode] = useState<ScanMode>("signup");
  const [tier, setTier] = useState<ScanTier>("free");
  const [activeRun, setActiveRun] = useState<ScanBundle | null>(null);
  const [publicResult, setPublicResult] = useState<ScanBundle | null>(null);
  const [leaderboard, setLeaderboard] = useState<ScanBundle[]>(demoLeaderboard);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() => {
    const match = window.location.pathname.match(/^\/r\/([^/]+)/);
    return match?.[1] ?? null;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSlug || liveMode) {
      return;
    }
    setPublicResult(demoLeaderboard.find((row) => row.run.publicSlug === selectedSlug) ?? null);
  }, [liveMode, selectedSlug]);

  useEffect(() => {
    return subscribeToLeaderboard(client, (rows) => {
      setLeaderboard(leaderboardVerdicts(rows));
    });
  }, [client]);

  useEffect(() => {
    return subscribeToPublicResult(client, selectedSlug, setPublicResult);
  }, [client, selectedSlug]);

  useEffect(() => {
    return subscribeToRun(client, activeRun?.run._id ?? null, (bundle) => {
      if (bundle) {
        setActiveRun(bundle);
      }
    });
  }, [client, activeRun?.run._id]);

  useEffect(() => {
    if (liveMode || !activeRun || ["completed", "failed", "cancelled"].includes(activeRun.run.status)) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveRun((current) => (current ? advanceDemoRun(current) : current));
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [activeRun, liveMode]);

  useEffect(() => {
    if (activeRun?.run.status === "completed") {
      setLeaderboard((rows) => [activeRun, ...rows.filter((row) => row.run._id !== activeRun.run._id)].slice(0, 10));
    }
  }, [activeRun]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const normalized = normalizeSubmittedUrl(url);
    if (!normalized.ok) {
      setError(normalized.error ?? "Enter a valid public app URL.");
      setSubmitting(false);
      return;
    }

    const normalizedUrl = normalized.value;
    if (!normalizedUrl) {
      setError("Enter a valid public app URL.");
      setSubmitting(false);
      return;
    }

    const input: SubmitScanInput = {
      url: normalizedUrl,
      mode,
      tier,
    };

    try {
      if (!liveMode) {
        setActiveRun(makeDemoRun(input));
        setPublicResult(null);
        setSelectedSlug(null);
        window.history.pushState({}, "", "/");
        return;
      }

      const result = await submitScan(input);
      if (!result) {
        throw new Error("Live scan submission is not configured.");
      }
      setActiveRun({
        run: {
          _id: result.scanRunId,
          mode,
          tier,
          status: "queued",
          survivedUsers: 0,
          maxUsers: tier === "deep" ? 25 : 5,
          currentStage: "Queued for exorcism",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        app: {
          url,
          normalizedUrl: result.normalizedUrl ?? normalizedUrl,
          title: new URL(normalizedUrl).hostname,
        },
        personas: [],
      });
      setPublicResult(null);
      setSelectedSlug(null);
      window.history.pushState({}, "", "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function openResult(slug: string) {
    setSelectedSlug(slug);
    const bundle = activeRun?.run.publicSlug === slug ? activeRun : leaderboard.find((row) => row.run.publicSlug === slug);
    setPublicResult(liveMode ? null : (bundle ?? null));
    window.history.pushState({}, "", `/r/${slug}`);
  }

  function closeResult() {
    setSelectedSlug(null);
    setPublicResult(null);
    window.history.pushState({}, "", "/");
  }

  const visibleResult = publicResult ?? (activeRun?.run.status === "completed" ? activeRun : null);

  if (selectedSlug) {
    return <PublicResultPage bundle={publicResult} onBack={closeResult} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <img src={brandAssets.icon192} alt="" />
          </div>
          <div>
            <p className="eyebrow">GrimReaper</p>
            <h1>AI QA that kills weak apps.</h1>
          </div>
        </div>
        <div className="system-strip" aria-label="System status">
          <StatusPill icon={<ShieldCheck size={16} />} label="Cloudflare" state="armed" />
          <StatusPill icon={<Activity size={16} />} label="Convex" state={convexUrl ? "live" : "demo"} />
          <StatusPill icon={<Flame size={16} />} label="Hermes" state={liveMode ? "ready" : "sim"} />
        </div>
      </header>

      <section className="workspace-grid">
        <div className="scan-console">
          <form className="submit-surface" onSubmit={handleSubmit}>
            <div className="form-intro">
              <div>
                <p className="eyebrow">New execution</p>
                <h2>Can your app survive?</h2>
              </div>
              <img src={brandAssets.wordmark} alt="GrimReaper" />
            </div>

            <div className="field-row">
              <label htmlFor="target-url">Target URL</label>
              <div className="url-input-wrap">
                <LinkIcon size={18} aria-hidden="true" />
                <input
                  id="target-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={formDefaults.placeholder}
                  autoComplete="url"
                />
              </div>
            </div>

            <div className="control-group">
              <span>Mode</span>
              <div className="segmented" role="radiogroup" aria-label="Scan mode">
                {modes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={mode === item.value ? "selected" : ""}
                    onClick={() => setMode(item.value)}
                    aria-pressed={mode === item.value}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="tier-grid">
              {tiers.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={tier === item.value ? "tier selected" : "tier"}
                  onClick={() => setTier(item.value)}
                  aria-pressed={tier === item.value}
                >
                  <span>{item.label}</span>
                  <small>{item.meta}</small>
                </button>
              ))}
            </div>

            {error ? <p className="error-line">{error}</p> : null}

            <button className="primary-action" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={18} /> : <ArrowRight size={18} />}
              Start scan
            </button>
          </form>

          <ProgressPanel bundle={activeRun} />
        </div>

        <div className="result-column">
          <VerdictPanel bundle={visibleResult} onOpenResult={openResult} />
          <Leaderboard rows={leaderboard} onOpenResult={openResult} />
        </div>
      </section>
    </main>
  );
}

function PublicResultPage({ bundle, onBack }: { bundle: ScanBundle | null; onBack: () => void }) {
  const report = publicReportView(bundle);

  return (
    <main className="public-report-shell">
      <header className="report-topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <img src={brandAssets.icon192} alt="" />
          </div>
          <div>
            <p className="eyebrow">GrimReaper</p>
            <strong>Public scan report</strong>
          </div>
        </div>
        <button type="button" className="report-back" onClick={onBack}>
          <ArrowLeft size={17} />
          Back to scanner
        </button>
      </header>

      {!report ? (
        <section className="report-loading" aria-live="polite">
          <LoaderCircle className="spin" size={28} />
          <p className="eyebrow">Retrieving certificate</p>
          <h1>Preparing the public report</h1>
          <p>The verdict and collected evidence are loading from Convex.</p>
        </section>
      ) : (
        <>
          <section className={`report-hero ${report.result}`}>
            <div className="report-hero-copy">
              <p className="eyebrow">{report.result === "dead" ? "App declared dead" : "App survived"}</p>
              <h1>{report.title}</h1>
              <a href={report.targetUrl} target="_blank" rel="noreferrer">
                {report.target}
                <ExternalLink size={16} />
              </a>
              <p>{report.verdict}</p>
            </div>
            <img
              className="report-art"
              src={report.result === "survived" ? brandAssets.survivalBadge : brandAssets.deathCertificate}
              alt=""
            />
            <div className="report-score" aria-label={`Score ${report.score}`}>
              <span>Score</span>
              <strong>{report.score}</strong>
              <small>{report.severity}</small>
            </div>
          </section>

          <section className="report-facts" aria-label="Report summary">
            <Metric label="Survivors" value={report.survivors} />
            <Metric label="Mode" value={report.mode} />
            <Metric label="Tier" value={report.tier} />
            <Metric label="Fatal route" value={report.fatalRoute} />
          </section>

          <section className="report-body">
            <article className="report-findings">
              <p className="eyebrow">Final verdict</p>
              <h2>{report.cause}</h2>
              <blockquote>{report.roast}</blockquote>
            </article>
            <aside className="report-fixes">
              <p className="eyebrow">Recommended fixes</p>
              <ol>
                {report.suggestions.map((suggestion: string) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ol>
            </aside>
          </section>

          <section className="report-evidence">
            <div className="report-section-heading">
              <div>
                <p className="eyebrow">Persona evidence</p>
                <h2>{report.personas.length} completed checks</h2>
              </div>
              <BadgeCheck size={24} aria-hidden="true" />
            </div>
            <div className="report-evidence-list">
              {report.personas.map((persona: PersonaRunRecord) => (
                <article key={persona.personaName}>
                  <div>
                    <strong>{persona.personaName}</strong>
                    <p>{persona.summary ?? persona.task}</p>
                  </div>
                  <span className={`persona-status ${persona.status}`}>{persona.status}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function StatusPill({ icon, label, state }: { icon: ReactNode; label: string; state: string }) {
  return (
    <div className="status-pill">
      {icon}
      <span>{label}</span>
      <strong>{state}</strong>
    </div>
  );
}

function ProgressPanel({ bundle }: { bundle: ScanBundle | null }) {
  const run = bundle?.run;
  const progress = progressForStatus(run?.status);

  return (
    <section className="progress-panel" aria-label="Scan progress">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Active scan</p>
          <h2>{targetLabel(bundle?.app)}</h2>
        </div>
        <span className={`state-chip ${run?.status ?? "idle"}`}>{run ? statusLabel(run.status) : "Idle"}</span>
      </div>

      <div className="progress-track" aria-label="Scan progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="run-stats">
        <Metric label="Stage" value={run?.currentStage ?? "Waiting"} />
        <Metric label="Personas" value={run ? `${bundle?.personas.length ?? 0}/${run.maxUsers}` : "0/0"} />
        <Metric label="Mode" value={run?.mode ?? "-"} />
      </div>

      <div className="persona-list">
        {(bundle?.personas ?? []).map((persona) => (
          <article className="persona-item" key={persona.personaName}>
            <div>
              <strong>{persona.personaName}</strong>
              <p>{persona.summary ?? persona.task}</p>
            </div>
            <span className={`persona-status ${persona.status}`}>{persona.status}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function VerdictPanel({
  bundle,
  onOpenResult,
}: {
  bundle: ScanBundle | null;
  onOpenResult: (slug: string) => void;
}) {
  const run = bundle?.run;
  const display = resultDisplay(run?.result);
  const certificate = bundle?.certificate;

  return (
    <section className={`verdict-panel ${display.accent}`} aria-label="Verdict">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Public verdict</p>
          <h2>{display.title}</h2>
        </div>
        <span className="verdict-badge">{display.badge}</span>
      </div>

      <div className="certificate-preview">
        <img
          className="certificate-art"
          src={run?.result === "survived" ? brandAssets.survivalBadge : brandAssets.deathCertificate}
          alt=""
        />
        <div>
          <p className="target-host">{bundle?.app?.title ?? "Awaiting result"}</p>
          <p className="verdict-copy">
            {certificate?.verdictText ??
              "Run a scan to publish a death certificate or survival badge with the collected evidence."}
          </p>
        </div>
      </div>

      <div className="run-stats">
        <Metric label="Score" value={run?.score ? `${run.score}/100` : "-"} />
        <Metric label="Survivors" value={run ? `${run.survivedUsers}/${run.maxUsers}` : "-"} />
        <Metric label="Fatal route" value={run?.fatalRoute ?? "-"} />
      </div>

      {certificate ? (
        <div className="fix-list">
          {certificate.fixSuggestions.map((suggestion) => (
            <span key={suggestion}>{suggestion}</span>
          ))}
        </div>
      ) : null}

      <div className="action-row">
        <button
          type="button"
          className="secondary-action"
          disabled={!run?.publicSlug}
          onClick={() => run?.publicSlug && onOpenResult(run.publicSlug)}
        >
          <RefreshCw size={16} />
          Open result
        </button>
        <button type="button" className="icon-action" disabled={!certificate?.audioUrl} aria-label="Play audio roast">
          <Volume2 size={17} />
        </button>
      </div>
    </section>
  );
}

function Leaderboard({
  rows,
  onOpenResult,
}: {
  rows: ScanBundle[];
  onOpenResult: (slug: string) => void;
}) {
  return (
    <section className="leaderboard" aria-label="Leaderboard">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h2>Recent verdicts</h2>
        </div>
        <Trophy size={22} aria-hidden="true" />
      </div>

      <div className="leaderboard-list">
        {rows.map((row) => (
          <button
            type="button"
            className="leaderboard-row"
            key={row.run._id}
            onClick={() => row.run.publicSlug && onOpenResult(row.run.publicSlug)}
          >
            <span>
              <strong>{row.app?.title ?? row.app?.normalizedUrl ?? "Unknown app"}</strong>
              <small>{row.run.mode} / {row.run.tier}</small>
            </span>
            <em className={row.run.result ?? "pending"}>{row.run.score ?? "-"}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
