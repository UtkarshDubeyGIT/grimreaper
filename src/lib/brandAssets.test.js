import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { brandAssets } from "./brandAssets.js";

describe("brandAssets", () => {
  it("exposes stable public paths for the grimreaper brand pack", () => {
    assert.deepEqual(brandAssets, {
      favicon: "/brand/icon/favicon.ico",
      appleTouchIcon: "/brand/icon/apple-touch-icon.png",
      icon192: "/brand/icon/icon-192.png",
      icon512: "/brand/icon/icon-512.png",
      wordmark: "/brand/logo/grimreaper-wordmark.png",
      mascotHero: "/brand/mascot/reaper-hero.png",
      deathCertificate: "/brand/templates/death-certificate.png",
      survivalBadge: "/brand/templates/survival-badge.png",
      ogBanner: "/brand/social/og-banner.png",
    });
  });
});
