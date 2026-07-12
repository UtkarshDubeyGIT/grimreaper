import argparse
import os
import sys
import traceback

from .config import RunnerConfig
from .convex_client import ConvexAdapter
from .scanner import run_scan, sleep_with_jitter
from .voice import generate_audio_artifact


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the GrimReaper DigitalOcean worker.")
    parser.add_argument("--once", action="store_true", help="Claim at most one scan and exit.")
    args = parser.parse_args()

    config = RunnerConfig.from_env(os.environ)
    if not config.convex_url:
        print("CONVEX_URL is required for the runner.", file=sys.stderr)
        return 2

    convex = ConvexAdapter(config.convex_url)

    while True:
        job = convex.claim_next_scan(config.runner_id, config.convex_runner_token)
        if not job:
            if args.once:
                print("No queued scan found.")
                return 0
            sleep_with_jitter(config.poll_interval_seconds)
            continue

        process_job(convex, config, job)
        if args.once:
            return 0


def process_job(convex: ConvexAdapter, config: RunnerConfig, job: dict) -> None:
    scan_run_id = str(job["scanRunId"])
    try:
        convex.heartbeat_scan(
            scan_run_id,
            config.runner_id,
            config.convex_runner_token,
            "Starting Hermes scan orchestration",
        )
        outcome = run_scan(job, config)

        for persona in outcome.personas:
            convex.upsert_persona_result(
                scan_run_id,
                config.runner_id,
                config.convex_runner_token,
                persona.to_convex(),
            )

        convex.heartbeat_scan(
            scan_run_id,
            config.runner_id,
            config.convex_runner_token,
            "Finalizing verdict",
        )
        result = outcome.to_convex()
        try:
            audio_url = generate_audio_artifact(convex, config, outcome.roastText)
            if audio_url:
                result["audioUrl"] = audio_url
        except Exception as exc:  # Voice is optional and must not suppress the verdict.
            print("Voice generation skipped for %s: %s" % (scan_run_id, str(exc)[:220]))
        convex.complete_scan(
            scan_run_id,
            config.runner_id,
            config.convex_runner_token,
            result,
        )
        print("Completed scan %s" % scan_run_id)
    except Exception as exc:  # noqa: BLE001 - runner must fail scans safely.
        traceback.print_exc()
        convex.fail_scan(
            scan_run_id,
            config.runner_id,
            config.convex_runner_token,
            "Runner failed before publishing a verdict: %s" % str(exc)[:220],
        )


if __name__ == "__main__":
    raise SystemExit(main())
