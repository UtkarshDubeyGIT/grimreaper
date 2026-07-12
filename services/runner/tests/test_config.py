import unittest

from grimreaper_runner.config import RunnerConfig
from grimreaper_runner.scan_plan import persona_tasks_for


class RunnerConfigTest(unittest.TestCase):
    def test_defaults_keep_demo_limits(self):
        config = RunnerConfig.from_env({})

        self.assertEqual(config.runner_id, "grimreaper-local")
        self.assertEqual(config.concurrency, 2)
        self.assertEqual(config.heartbeat_interval_seconds, 10)
        self.assertFalse(config.elevenlabs_enabled)
        self.assertTrue(config.linkup_enabled)

    def test_env_overrides_are_parsed(self):
        config = RunnerConfig.from_env(
            {
                "RUNNER_ID": "do-runner-1",
                "RUNNER_CONCURRENCY": "4",
                "RUNNER_HEARTBEAT_INTERVAL_MS": "15000",
                "ELEVENLABS_ENABLED": "true",
            }
        )

        self.assertEqual(config.runner_id, "do-runner-1")
        self.assertEqual(config.concurrency, 4)
        self.assertEqual(config.heartbeat_interval_seconds, 15)
        self.assertTrue(config.elevenlabs_enabled)


class PersonaPlanTest(unittest.TestCase):
    def test_free_signup_scan_contains_bounded_personas(self):
        tasks = persona_tasks_for(mode="signup", tier="free")

        self.assertEqual(len(tasks), 5)
        self.assertTrue(any(task["route_hint"] == "/signup" for task in tasks))
        self.assertTrue(all(len(task["task"]) < 220 for task in tasks))

    def test_deep_scan_expands_to_twenty_five_personas(self):
        self.assertEqual(len(persona_tasks_for(mode="chaos", tier="deep")), 25)


if __name__ == "__main__":
    unittest.main()
