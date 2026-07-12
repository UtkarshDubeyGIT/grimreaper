import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSubmitScanBody } from "./submitRequest.js";

describe("parseSubmitScanBody", () => {
  it("accepts a public URL and defaults mode/tier for the free path", () => {
    assert.deepEqual(parseSubmitScanBody({ url: "grimreaper.app" }), {
      ok: true,
      value: {
        url: "https://grimreaper.app/",
        mode: "landing",
        tier: "free",
      },
    });
  });

  it("preserves supported scan mode and tier", () => {
    assert.deepEqual(parseSubmitScanBody({ url: "https://example.com/signup", mode: "signup", tier: "deep" }), {
      ok: true,
      value: {
        url: "https://example.com/signup",
        mode: "signup",
        tier: "deep",
      },
    });
  });

  it("rejects malformed or private targets", () => {
    assert.equal(parseSubmitScanBody({ url: "http://localhost:8787" }).ok, false);
    assert.equal(parseSubmitScanBody({ url: "ftp://example.com" }).ok, false);
    assert.equal(parseSubmitScanBody({}).ok, false);
  });
});
