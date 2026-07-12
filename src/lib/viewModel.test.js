import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { progressForStatus, resultDisplay } from "./viewModel.js";

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
