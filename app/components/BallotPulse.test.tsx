import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BallotPulse } from "./BallotPulse";
import type { BallotMetrics } from "@/lib/metrics";
import { testBallotMetrics } from "@/tests/ballot-metrics";

describe("BallotPulse", () => {
  it("renders the supplied live metrics", () => {
    const html = renderToStaticMarkup(
      <BallotPulse metrics={testBallotMetrics} />,
    );

    expect(html).toContain("Ballot pulse · Live");
    expect(html).toContain("Dried mango slices");
    expect(html).toContain("90%");
    expect(html).toContain("10 of 12 people");
    expect(html).toContain(
      "Rank history: 9th, 6th, 8th, 7th, 3rd",
    );
  });

  it("renders honest empty states before enough data exists", () => {
    const emptyMetrics: BallotMetrics = {
      ...testBallotMetrics,
      period: {
        ...testBallotMetrics.period,
        previousStartedAt: null,
        previousEndedAt: null,
      },
      crowdFavourite: null,
      mostDebated: null,
      biggestMover: null,
      needsCampaign: null,
      turnout: {
        participantCount: 0,
        memberCount: 1,
        percentage: 0,
        deltaPoints: null,
      },
      freshSuggestions: {
        currentCount: 0,
        previousCount: null,
        delta: null,
      },
    };

    const html = renderToStaticMarkup(
      <BallotPulse metrics={emptyMetrics} />,
    );

    expect(html).toContain("First tracked cycle");
    expect(html).toContain("Not enough votes yet");
    expect(html).toContain("No rank gain yet");
    expect(html).toContain("No votes yet");
  });
});
