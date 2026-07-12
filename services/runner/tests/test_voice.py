import unittest
from unittest.mock import patch

from grimreaper_runner.config import RunnerConfig
from grimreaper_runner.voice import generate_audio_artifact


class FakeConvex:
    def __init__(self):
        self.uploaded = None

    def upload_audio(self, runner_token, audio_bytes, content_type):
        self.uploaded = (runner_token, audio_bytes, content_type)
        return "https://files.example/roast.mp3"


class VoiceArtifactTest(unittest.TestCase):
    def test_generates_mp3_and_uploads_it(self):
        config = RunnerConfig.from_env(
            {
                "CONVEX_RUNNER_TOKEN": "runner-token",
                "ELEVENLABS_ENABLED": "true",
                "ELEVENLABS_API_KEY": "eleven-key",
                "ELEVENLABS_VOICE_ID": "voice-id",
            }
        )
        convex = FakeConvex()

        with patch(
            "grimreaper_runner.voice.request_elevenlabs_audio",
            return_value=b"mp3-bytes",
        ) as request_audio:
            url = generate_audio_artifact(convex, config, "A final roast.")

        self.assertEqual(url, "https://files.example/roast.mp3")
        request_audio.assert_called_once_with("eleven-key", "voice-id", "A final roast.")
        self.assertEqual(
            convex.uploaded,
            ("runner-token", b"mp3-bytes", "audio/mpeg"),
        )

    def test_disabled_voice_does_not_call_elevenlabs(self):
        config = RunnerConfig.from_env({})

        with patch("grimreaper_runner.voice.request_elevenlabs_audio") as request_audio:
            url = generate_audio_artifact(FakeConvex(), config, "A final roast.")

        self.assertIsNone(url)
        request_audio.assert_not_called()


if __name__ == "__main__":
    unittest.main()
