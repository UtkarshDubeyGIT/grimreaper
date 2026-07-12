from typing import Dict, List

BASE_PERSONAS = [
    {
        "persona_name": "Impatient founder",
        "route_hint": "/",
        "task": "Find the primary value proposition and trigger the most obvious call to action.",
    },
    {
        "persona_name": "Skeptical buyer",
        "route_hint": "/pricing",
        "task": "Check whether pricing, trust signals, and the conversion path are understandable.",
    },
    {
        "persona_name": "First-time signup",
        "route_hint": "/signup",
        "task": "Attempt signup using safe fake details and report any blocking feedback states.",
    },
    {
        "persona_name": "Keyboard-only operator",
        "route_hint": "/",
        "task": "Navigate the primary path without a mouse and report traps or inaccessible controls.",
    },
    {
        "persona_name": "Low-patience mobile user",
        "route_hint": "/",
        "task": "Inspect the app as a narrow mobile viewport and look for clipped actions or unreadable text.",
    },
]

DEEP_VARIATIONS = [
    "Return after a refresh and verify state recovery.",
    "Look for console errors while moving through the path.",
    "Try an invalid form entry and inspect validation quality.",
    "Use a slow-network mindset and identify spinner dead ends.",
    "Inspect empty states and first-run dashboard affordances.",
]


def persona_tasks_for(mode: str, tier: str) -> List[Dict[str, str]]:
    tasks = list(BASE_PERSONAS)

    if mode == "landing":
        tasks[2] = {
            "persona_name": "CTA skeptic",
            "route_hint": "/",
            "task": "Click the primary CTA and decide whether the next step is obvious and reachable.",
        }
    elif mode == "dashboard":
        tasks[1] = {
            "persona_name": "Returning operator",
            "route_hint": "/dashboard",
            "task": "Reach the dashboard or explain the auth wall and recovery route.",
        }
    elif mode == "chaos":
        tasks[3] = {
            "persona_name": "Chaos tester",
            "route_hint": "/",
            "task": "Probe navigation, forms, refreshes, and error states without destructive actions.",
        }

    if tier != "deep":
        return tasks[:5]

    expanded = []
    for index in range(25):
        base = tasks[index % len(tasks)]
        variation = DEEP_VARIATIONS[index % len(DEEP_VARIATIONS)]
        expanded.append(
            {
                "persona_name": "%s %02d" % (base["persona_name"], index + 1),
                "route_hint": base["route_hint"],
                "task": "%s %s" % (base["task"], variation),
            }
        )
    return expanded
