import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

describe("live scan flow contracts", () => {
  it("returns the death certificate with getRun so the active verdict panel can resolve immediately", () => {
    const source = readFileSync(new URL("../../convex/scans.ts", import.meta.url), "utf8");
    const getRunBody = source.slice(source.indexOf("export const getRun"), source.indexOf("export const getPublicResult"));

    assert.match(getRunBody, /query\("deathCertificates"\)/);
    assert.match(getRunBody, /withIndex\("by_scanRunId"/);
    assert.match(getRunBody, /return \{ run, app, certificate, personas \};/);
  });

  it("keeps the Convex schema compatible with deployed audio and payment flow records", () => {
    const source = readFileSync(new URL("../../convex/schema.ts", import.meta.url), "utf8");

    assert.match(source, /v\.literal\("awaiting_payment"\)/);
    assert.match(source, /audioStatus: v\.optional/);
    assert.match(source, /audioAttempts: v\.optional\(v\.number\(\)\)/);
    assert.match(source, /providerPaymentId: v\.optional\(v\.string\(\)\)/);
    assert.match(source, /paymentEvents: defineTable/);
  });
});
