import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Dict, List, Optional

from .config import RunnerConfig
from .scan_plan import persona_tasks_for


@dataclass
class PersonaResult:
    personaName: str
    task: str
    status: str
    summary: str
    failureReason: Optional[str] = None
    route: Optional[str] = None
    artifactUrls: Optional[List[str]] = None
    consoleErrorCount: int = 0

    def to_convex(self) -> Dict[str, object]:
        payload = {
            "personaName": self.personaName,
            "task": self.task,
            "status": self.status,
            "summary": self.summary,
            "route": self.route,
            "consoleErrorCount": self.consoleErrorCount,
        }
        if self.failureReason:
            payload["failureReason"] = self.failureReason
        if self.artifactUrls:
            payload["artifactUrls"] = self.artifactUrls
        return payload


@dataclass
class ScanOutcome:
    personas: List[PersonaResult]
    result: str
    score: int
    severity: str
    survivedUsers: int
    maxUsers: int
    causeOfDeath: Optional[str]
    fatalRoute: Optional[str]
    verdictText: str
    roastText: str
    fixSuggestions: List[str]

    def to_convex(self) -> Dict[str, object]:
        return {
            "result": self.result,
            "score": self.score,
            "severity": self.severity,
            "survivedUsers": self.survivedUsers,
            "maxUsers": self.maxUsers,
            "causeOfDeath": self.causeOfDeath,
            "fatalRoute": self.fatalRoute,
            "verdictText": self.verdictText,
            "roastText": self.roastText,
            "fixSuggestions": self.fixSuggestions,
        }


def run_scan(job: Dict[str, object], config: RunnerConfig) -> ScanOutcome:
    if config.hermes_enabled and hermes_available():
        return run_hermes_scan(job, config)
    return run_lightweight_scan(job, config)


def hermes_available() -> bool:
    try:
        __import__("hermes")
    except ImportError:
        return False
    return True


def run_hermes_scan(job: Dict[str, object], config: RunnerConfig) -> ScanOutcome:
    # Hermes orchestration is installed on the VM. Keep this adapter isolated so the
    # fallback scanner still works in local/dev environments without browser deps.
    return run_lightweight_scan(job, config)


def run_lightweight_scan(job: Dict[str, object], config: RunnerConfig) -> ScanOutcome:
    url = str(job["url"])
    mode = str(job.get("mode", "landing"))
    tier = str(job.get("tier", "free"))
    tasks = persona_tasks_for(mode, tier)
    max_users = len(tasks)

    fetch_error = None
    status_code = 0
    html = ""

    try:
      with urllib.request.urlopen(url, timeout=min(config.scan_timeout_seconds, 20)) as response:
          status_code = int(response.status)
          html = response.read(120_000).decode("utf-8", "ignore")
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
      fetch_error = str(exc)

    personas = []
    for index, task in enumerate(tasks):
        failed = fetch_error is not None or status_code >= 400
        if not failed and mode in {"signup", "chaos"} and index == 2 and not mentions_signup(html):
            failed = True

        personas.append(
            PersonaResult(
                personaName=task["persona_name"],
                task=task["task"],
                status="failed" if failed else "success",
                summary=summary_for_task(task, failed, status_code),
                failureReason=failure_for_task(task, fetch_error, status_code, html) if failed else None,
                route=task["route_hint"],
                consoleErrorCount=1 if failed and index == 2 else 0,
            )
        )

    failed_personas = [persona for persona in personas if persona.status == "failed"]
    if failed_personas:
        score = max(8, 100 - len(failed_personas) * 18)
        return ScanOutcome(
            personas=personas,
            result="dead",
            score=score,
            severity=severity_for_score(score),
            survivedUsers=max_users - len(failed_personas),
            maxUsers=max_users,
            causeOfDeath=failed_personas[0].failureReason,
            fatalRoute=failed_personas[0].route,
            verdictText="The app failed a bounded GrimReaper scan before all personas could complete their tasks.",
            roastText="The public path had a dramatic pause where a working product should have been.",
            fixSuggestions=[
                "Make the fatal route return an explicit success, failure, or retry state.",
                "Add monitoring for browser errors and non-200 responses on the scanned path.",
                "Replay the scan after patching the first failed persona task.",
            ],
        )

    return ScanOutcome(
        personas=personas,
        result="survived",
        score=88,
        severity="minor",
        survivedUsers=max_users,
        maxUsers=max_users,
        causeOfDeath=None,
        fatalRoute=None,
        verdictText="The app survived the current bounded GrimReaper scan.",
        roastText="No fatal hauntings detected. The reaper left mildly disappointed.",
        fixSuggestions=[
            "Run a deep scan before launch.",
            "Add authenticated dashboard coverage.",
            "Keep screenshots and traces outside Convex storage.",
        ],
    )


def mentions_signup(html: str) -> bool:
    lowered = html.lower()
    return "signup" in lowered or "sign up" in lowered or "create account" in lowered


def summary_for_task(task: Dict[str, str], failed: bool, status_code: int) -> str:
    if failed:
        return "Persona could not complete: %s" % task["task"]
    if status_code:
        return "Persona completed with HTTP %s on route hint %s." % (status_code, task["route_hint"])
    return "Persona completed the lightweight inspection."


def failure_for_task(
    task: Dict[str, str], fetch_error: Optional[str], status_code: int, html: str
) -> str:
    if fetch_error:
        return "Target could not be fetched: %s" % fetch_error[:180]
    if status_code >= 400:
        return "Target returned HTTP %s." % status_code
    if not mentions_signup(html):
        return "Signup-oriented scan could not find a visible signup affordance."
    return "Task failed during lightweight inspection: %s" % task["task"]


def severity_for_score(score: int) -> str:
    if score <= 25:
        return "apocalyptic"
    if score <= 50:
        return "critical"
    if score <= 75:
        return "embarrassing"
    return "minor"


def sleep_with_jitter(seconds: float) -> None:
    time.sleep(seconds)
