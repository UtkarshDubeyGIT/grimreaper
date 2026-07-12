import json
import urllib.request
from typing import Any, Dict, Optional


class ConvexAdapter:
    def __init__(self, convex_url: str):
        try:
            from convex import ConvexClient
        except ImportError as exc:
            raise RuntimeError(
                "Install the Convex Python client in the runner environment: pip install convex"
            ) from exc

        self._client = ConvexClient(convex_url)

    def claim_next_scan(self, runner_id: str, runner_token: Optional[str]) -> Optional[Dict[str, Any]]:
        return self._client.mutation(
            "scans:claimNextScan",
            {"runnerId": runner_id, "runnerToken": runner_token},
        )

    def heartbeat_scan(
        self, scan_run_id: str, runner_id: str, runner_token: Optional[str], stage: str
    ) -> None:
        self._client.mutation(
            "scans:heartbeatScan",
            {
                "scanRunId": scan_run_id,
                "runnerId": runner_id,
                "runnerToken": runner_token,
                "stage": stage,
            },
        )

    def upsert_persona_result(
        self,
        scan_run_id: str,
        runner_id: str,
        runner_token: Optional[str],
        persona: Dict[str, object],
    ) -> None:
        self._client.mutation(
            "scans:upsertPersonaResult",
            {
                "scanRunId": scan_run_id,
                "runnerId": runner_id,
                "runnerToken": runner_token,
                "persona": persona,
            },
        )

    def complete_scan(
        self,
        scan_run_id: str,
        runner_id: str,
        runner_token: Optional[str],
        result: Dict[str, object],
    ) -> Dict[str, Any]:
        return self._client.mutation(
            "scans:completeScan",
            {
                "scanRunId": scan_run_id,
                "runnerId": runner_id,
                "runnerToken": runner_token,
                "result": result,
            },
        )

    def upload_audio(
        self, runner_token: Optional[str], audio_bytes: bytes, content_type: str
    ) -> str:
        upload_url = self._client.mutation(
            "artifacts:createAudioUploadUrl",
            {"runnerToken": runner_token},
        )
        request = urllib.request.Request(
            upload_url,
            data=audio_bytes,
            method="POST",
            headers={"content-type": content_type},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            upload = json.loads(response.read().decode("utf-8"))

        return self._client.mutation(
            "artifacts:resolveAudioUrl",
            {
                "runnerToken": runner_token,
                "storageId": upload["storageId"],
            },
        )

    def fail_scan(
        self, scan_run_id: str, runner_id: str, runner_token: Optional[str], error_message: str
    ) -> None:
        self._client.mutation(
            "scans:failScan",
            {
                "scanRunId": scan_run_id,
                "runnerId": runner_id,
                "runnerToken": runner_token,
                "errorMessage": error_message,
            },
        )
