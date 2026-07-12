import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  leaderboardVerdicts,
  progressForStatus,
  resultDisplay,
  targetLabel,
} from "./viewModel.js";

describe("progressForStatus", () => {
  it("maps scan statuses to stable progress values", () => {
    assert.equal(progressForStatus("queued"), 8);
    assert.equal(progressForStatus("claiming"), 20);
    assert.equal(progressForStatus("running"), 55);
    assert.equal(progressForStatus("finalizing"), 78);
    assert.equal(progressForStatus("completed"), 100);
    assert.equal(progressForStatus("failed"), 100);
  });
});

describe("resultDisplay", () => {
  it("uses death certificate language for dead apps", () => {
    assert.deepEqual(resultDisplay("dead"), {
      title: "Death certificate",
      badge: "App declared dead",
      accent: "danger",
    });
  });

  it("uses survival language for surviving apps", () => {
    assert.deepEqual(resultDisplay("survived"), {
      title: "Survival badge",
      badge: "Survived the haunt",
      accent: "safe",
    });
  });
});

describe("targetLabel", () => {
  it("uses the URL hostname when Convex has no optional app title", () => {
    assert.equal(
      targetLabel({
        url: "https://quickcart.example/checkout",
        normalizedUrl: "https://quickcart.example/checkout",
      }),
      "quickcart.example",
    );
  });
});

describe("leaderboardVerdicts", () => {
  it("omits failed and unscored runs from recent verdicts", () => {
    const completed = { run: { status: "completed", result: "survived", score: 88 } };
    const failed = { run: { status: "failed" } };

    assert.deepEqual(leaderboardVerdicts([failed, completed]), [completed]);
  });
});
