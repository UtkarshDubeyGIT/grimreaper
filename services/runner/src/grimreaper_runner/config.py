from dataclasses import dataclass
from typing import Mapping, Optional


@dataclass(frozen=True)
class RunnerConfig:
    convex_url: Optional[str]
    convex_runner_token: Optional[str]
    openai_api_key: Optional[str]
    elevenlabs_api_key: Optional[str]
    elevenlabs_voice_id: Optional[str]
    linkup_api_key: Optional[str]
    artifact_storage_provider: str
    runner_id: str
    concurrency: int
    poll_interval_seconds: float
    heartbeat_interval_seconds: float
    scan_timeout_seconds: int
    linkup_enabled: bool
    elevenlabs_enabled: bool
    dodo_enabled: bool
    hermes_enabled: bool

    @classmethod
    def from_env(cls, env: Mapping[str, str]) -> "RunnerConfig":
        return cls(
            convex_url=empty_to_none(env.get("CONVEX_URL")),
            convex_runner_token=empty_to_none(env.get("CONVEX_RUNNER_TOKEN")),
            openai_api_key=empty_to_none(env.get("OPENAI_API_KEY")),
            elevenlabs_api_key=empty_to_none(env.get("ELEVENLABS_API_KEY")),
            elevenlabs_voice_id=empty_to_none(env.get("ELEVENLABS_VOICE_ID")),
            linkup_api_key=empty_to_none(env.get("LINKUP_API_KEY")),
            artifact_storage_provider=env.get("ARTIFACT_STORAGE_PROVIDER", "local"),
            runner_id=env.get("RUNNER_ID", "grimreaper-local"),
            concurrency=positive_int(env.get("RUNNER_CONCURRENCY"), 2),
            poll_interval_seconds=positive_int(env.get("RUNNER_POLL_INTERVAL_MS"), 2500) / 1000,
            heartbeat_interval_seconds=positive_int(
                env.get("RUNNER_HEARTBEAT_INTERVAL_MS"), 10000
            )
            / 1000,
            scan_timeout_seconds=positive_int(env.get("FREE_SCAN_TIMEOUT_SECONDS"), 90),
            linkup_enabled=bool_env(env.get("LINKUP_ENABLED"), True),
            elevenlabs_enabled=bool_env(env.get("ELEVENLABS_ENABLED"), False),
            dodo_enabled=bool_env(env.get("DODO_ENABLED"), False),
            hermes_enabled=bool_env(env.get("HERMES_ENABLED"), True),
        )


def empty_to_none(value: Optional[str]) -> Optional[str]:
    if value is None or value.strip() == "":
        return None
    return value


def positive_int(value: Optional[str], fallback: int) -> int:
    try:
        parsed = int(value) if value is not None else fallback
    except ValueError:
        return fallback
    return parsed if parsed > 0 else fallback


def bool_env(value: Optional[str], fallback: bool) -> bool:
    if value is None:
        return fallback
    return value.strip().lower() in {"1", "true", "yes", "on"}
