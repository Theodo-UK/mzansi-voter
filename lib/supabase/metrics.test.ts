import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { fixtureBallotMetrics } from "@/lib/metrics";
import { loadBallotMetrics } from "./metrics";

describe("metrics repository", () => {
  it("loads and validates the authenticated metrics aggregate", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: fixtureBallotMetrics,
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;

    await expect(loadBallotMetrics(client)).resolves.toEqual(
      fixtureBallotMetrics,
    );
    expect(rpc).toHaveBeenCalledWith("get_ballot_metrics");
  });

  it("surfaces database errors", async () => {
    const failure = new Error("Metrics unavailable");
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: failure }),
    } as unknown as SupabaseClient;

    await expect(loadBallotMetrics(client)).rejects.toBe(failure);
  });
});
