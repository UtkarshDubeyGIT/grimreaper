import unittest
from unittest.mock import patch

from grimreaper_runner.config import RunnerConfig
from grimreaper_runner.main import process_job
from grimreaper_runner.scanner import ScanOutcome


class FakeConvex:
    def __init__(self):
        self.completed = None
        self.failed = None

    def heartbeat_scan(self, *args):
        pass

    def upsert_persona_result(self, *args):
        pass

    def complete_scan(self, scan_run_id, runner_id, runner_token, result):
        self.completed = result

    def fail_scan(self, *args):
        self.failed = args


def outcome():
    return ScanOutcome(
        personas=[],
        result="survived",
        score=88,
        severity="minor",
        survivedUsers=5,
        maxUsers=5,
        causeOfDeath=None,
        fatalRoute=None,
        verdictText="The app survived.",
        roastText="The reaper left disappointed.",
        fixSuggestions=["Run a deeper scan."],
    )


class VoiceCompletionTest(unittest.TestCase):
    def test_attaches_generated_audio_to_completed_scan(self):
        convex = FakeConvex()
        config = RunnerConfig.from_env({"RUNNER_ID": "runner-1"})

        with patch("grimreaper_runner.main.run_scan", return_value=outcome()), patch(
            "grimreaper_runner.main.generate_audio_artifact",
            return_value="https://files.example/roast.mp3",
        ):
            process_job(convex, config, {"scanRunId": "scan-1"})

        self.assertEqual(convex.completed["audioUrl"], "https://files.example/roast.mp3")
        self.assertIsNone(convex.failed)

    def test_voice_failure_still_completes_text_report(self):
        convex = FakeConvex()
        config = RunnerConfig.from_env({"RUNNER_ID": "runner-1"})

        with patch("grimreaper_runner.main.run_scan", return_value=outcome()), patch(
            "grimreaper_runner.main.generate_audio_artifact",
            side_effect=RuntimeError("voice unavailable"),
        ):
            process_job(convex, config, {"scanRunId": "scan-1"})

        self.assertNotIn("audioUrl", convex.completed)
        self.assertIsNone(convex.failed)


if __name__ == "__main__":
    unittest.main()
