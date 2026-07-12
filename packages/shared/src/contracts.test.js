import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyFallbackResult,
  isAllowedStatusTransition,
  normalizeSubmittedUrl,
  scanConfigForTier,
} from "./contracts.js";

describe("normalizeSubmittedUrl", () => {
  it("normalizes common public URLs", () => {
    assert.equal(normalizeSubmittedUrl("Example.com/signup#pricing").value, "https://example.com/signup");
    assert.equal(normalizeSubmittedUrl("HTTP://WWW.Example.com:80/").value, "http://www.example.com/");
  });

  it("rejects protocols and hosts that should never be scanned", () => {
    const blocked = [
      "ftp://example.com",
      "http://localhost:3000",
      "http://127.0.0.1",
      "http://10.0.0.12",
      "http://172.16.3.2",
      "http://192.168.1.8",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/",
      "staging-internal",
    ];

    for (const url of blocked) {
      assert.equal(normalizeSubmittedUrl(url).ok, false, url);
    }
  });
});

describe("scanConfigForTier", () => {
  it("uses guarded demo defaults for free and deep scans", () => {
    assert.deepEqual(scanConfigForTier("free"), {
      personas: 5,
      timeoutSeconds: 90,
      maxScreenshots: 2,
    });
    assert.deepEqual(scanConfigForTier("deep"), {
      personas: 25,
      timeoutSeconds: 300,
      maxScreenshots: 10,
    });
  });

  it("accepts environment overrides without changing mode semantics", () => {
    assert.deepEqual(
      scanConfigForTier("free", {
        FREE_SCAN_PERSONAS: "3",
        FREE_SCAN_TIMEOUT_SECONDS: "45",
        FREE_SCAN_MAX_SCREENSHOTS: "1",
      }),
      {
        personas: 3,
        timeoutSeconds: 45,
        maxScreenshots: 1,
      },
    );
  });
});

describe("isAllowedStatusTransition", () => {
  it("allows only documented scan status transitions", () => {
    assert.equal(isAllowedStatusTransition("queued", "claiming"), true);
    assert.equal(isAllowedStatusTransition("claiming", "running"), true);
    assert.equal(isAllowedStatusTransition("running", "finalizing"), true);
    assert.equal(isAllowedStatusTransition("finalizing", "completed"), true);
    assert.equal(isAllowedStatusTransition("running", "failed"), true);
    assert.equal(isAllowedStatusTransition("queued", "completed"), false);
    assert.equal(isAllowedStatusTransition("completed", "running"), false);
  });
});

describe("classifyFallbackResult", () => {
  it("marks a run dead when collected evidence contains failed personas or many console errors", () => {
    assert.equal(
      classifyFallbackResult([
        { status: "success", consoleErrorCount: 1 },
        { status: "failed", failureReason: "Signup button never responds", route: "/signup" },
      ]).result,
      "dead",
    );

    assert.equal(
      classifyFallbackResult([
        { status: "success", consoleErrorCount: 2 },
        { status: "success", consoleErrorCount: 2 },
      ]).result,
      "dead",
    );
  });

  it("marks a run survived when no fatal evidence was collected", () => {
    assert.deepEqual(
      classifyFallbackResult([{ status: "success", consoleErrorCount: 0 }]),
      {
        result: "survived",
        score: 88,
        severity: "minor",
        causeOfDeath: undefined,
        fatalRoute: undefined,
      },
    );
  });
});
