import unittest

from grimreaper_runner.scanner import ScanOutcome


class ScanOutcomeSerializationTest(unittest.TestCase):
    def test_survival_payload_omits_missing_fatal_evidence(self):
        outcome = ScanOutcome(
            personas=[],
            result="survived",
            score=88,
            severity="minor",
            survivedUsers=5,
            maxUsers=5,
            causeOfDeath=None,
            fatalRoute=None,
            verdictText="The app survived.",
            roastText="No fatal failure found.",
            fixSuggestions=["Run a deeper scan."],
        )

        payload = outcome.to_convex()

        self.assertNotIn("causeOfDeath", payload)
        self.assertNotIn("fatalRoute", payload)


if __name__ == "__main__":
    unittest.main()
