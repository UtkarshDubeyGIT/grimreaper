import { ConvexClient, ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { ScanBundle, SubmitScanInput } from "./types";

export function createRealtimeClient(convexUrl: string | undefined) {
  if (!convexUrl) {
    return null;
  }
  return new ConvexClient(convexUrl);
}

export async function submitScan(input: SubmitScanInput) {
  const edgeBase = import.meta.env.VITE_EDGE_API_BASE;
  const convexUrl = import.meta.env.VITE_CONVEX_URL;

  if (edgeBase) {
    const response = await fetch(`${edgeBase.replace(/\/$/, "")}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error((await response.json()).error ?? "Scan submission failed.");
    }

    return await response.json();
  }

  if (convexUrl) {
    const client = new ConvexHttpClient(convexUrl);
    return await client.mutation(anyApi.scans.submitScan, input);
  }

  return null;
}

export function subscribeToRun(
  client: ConvexClient | null,
  scanRunId: string | null,
  onUpdate: (bundle: ScanBundle | null) => void,
) {
  if (!client || !scanRunId) {
    return () => undefined;
  }

  return client.onUpdate(anyApi.scans.getRun, { scanRunId }, onUpdate);
}

export function subscribeToLeaderboard(
  client: ConvexClient | null,
  onUpdate: (rows: ScanBundle[]) => void,
) {
  if (!client) {
    return () => undefined;
  }

  return client.onUpdate(anyApi.scans.getLeaderboard, { limit: 10 }, onUpdate);
}

export function subscribeToPublicResult(
  client: ConvexClient | null,
  publicSlug: string | null,
  onUpdate: (bundle: ScanBundle | null) => void,
) {
  if (!client || !publicSlug) {
    return () => undefined;
  }

  return client.onUpdate(anyApi.scans.getPublicResult, { publicSlug }, (result: any) => {
    if (!result) {
      onUpdate(null);
      return;
    }

    onUpdate({
      run: result.run,
      app: result.app,
      personas: result.personas ?? [],
      certificate: result.certificate,
    });
  });
}
