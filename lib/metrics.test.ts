import { describe, expect, it } from "vitest";
import { ballotMetricsSchema, fixtureBallotMetrics } from "./metrics";

describe("ballot metrics contract", () => {
  it("accepts the complete metrics payload", () => {
    expect(ballotMetricsSchema.parse(fixtureBallotMetrics)).toEqual(
      fixtureBallotMetrics,
    );
  });

  it("rejects impossible percentages", () => {
    expect(() =>
      ballotMetricsSchema.parse({
        ...fixtureBallotMetrics,
        turnout: {
          ...fixtureBallotMetrics.turnout,
          percentage: 101,
        },
      }),
    ).toThrow();
  });
});
