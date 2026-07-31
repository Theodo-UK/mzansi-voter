import { describe, expect, it } from "vitest";
import { testBallotMetrics } from "@/tests/ballot-metrics";
import { ballotMetricsSchema } from "./metrics";

describe("ballot metrics contract", () => {
  it("accepts the complete metrics payload", () => {
    expect(ballotMetricsSchema.parse(testBallotMetrics)).toEqual(
      testBallotMetrics,
    );
  });

  it("rejects impossible percentages", () => {
    expect(() =>
      ballotMetricsSchema.parse({
        ...testBallotMetrics,
        turnout: {
          ...testBallotMetrics.turnout,
          percentage: 101,
        },
      }),
    ).toThrow();
  });
});
