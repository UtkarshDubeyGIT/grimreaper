import json
import urllib.error
import urllib.request
from typing import Optional

from .config import RunnerConfig


def generate_audio_artifact(convex, config: RunnerConfig, roast_text: str) -> Optional[str]:
    if not config.elevenlabs_enabled:
        return None
    if not config.elevenlabs_api_key or not config.elevenlabs_voice_id:
        raise RuntimeError("ElevenLabs is enabled but its API key or voice ID is missing.")

    audio = request_elevenlabs_audio(
        config.elevenlabs_api_key,
        config.elevenlabs_voice_id,
        roast_text,
    )
    return convex.upload_audio(config.convex_runner_token, audio, "audio/mpeg")


def request_elevenlabs_audio(api_key: str, voice_id: str, text: str) -> bytes:
    url = (
        "https://api.elevenlabs.io/v1/text-to-speech/%s"
        "?output_format=mp3_44100_128" % voice_id
    )
    payload = json.dumps(
        {
            "text": text[:1200],
            "model_id": "eleven_multilingual_v2",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "content-type": "application/json",
            "accept": "audio/mpeg",
            "xi-api-key": api_key,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            audio = response.read(8_000_000)
    except urllib.error.HTTPError as exc:
        detail = exc.read(500).decode("utf-8", "ignore")
        raise RuntimeError("ElevenLabs request failed (%s): %s" % (exc.code, detail)) from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError("ElevenLabs request failed: %s" % exc) from exc

    if not audio:
        raise RuntimeError("ElevenLabs returned an empty audio response.")
    return audio
