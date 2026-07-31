import type { BallotMetrics } from "@/lib/metrics";

export const testBallotMetrics = {
  groupName: "Cape Town",
  period: {
    currentStartedAt: "2026-07-28T00:00:00.000+02:00",
    previousStartedAt: "2026-07-21T00:00:00.000+02:00",
    previousEndedAt: "2026-07-28T00:00:00.000+02:00",
  },
  crowdFavourite: {
    itemId: "00000000-0000-4000-8000-000000000101",
    name: "Dried mango slices",
    upVotes: 9,
    downVotes: 1,
    approvalPercent: 90,
    approvalDeltaPoints: 12,
  },
  mostDebated: {
    itemId: "00000000-0000-4000-8000-000000000102",
    name: "Whole milk tart",
    upVotes: 5,
    downVotes: 4,
    voteDelta: 4,
  },
  biggestMover: {
    itemId: "00000000-0000-4000-8000-000000000103",
    name: "Naartjies",
    previousRank: 7,
    currentRank: 3,
    gain: 4,
  },
  needsCampaign: {
    itemId: "00000000-0000-4000-8000-000000000104",
    name: "Hummus x2",
    upVotes: 2,
    downVotes: 5,
    netScore: -3,
    netDelta: -2,
  },
  turnout: {
    participantCount: 10,
    memberCount: 12,
    percentage: 83,
    deltaPoints: 9,
  },
  freshSuggestions: {
    currentCount: 6,
    previousCount: 4,
    delta: 2,
  },
} satisfies BallotMetrics;
