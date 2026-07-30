import { z } from "zod";

const timestampSchema = z.string().datetime({ offset: true });
const countSchema = z.number().int().nonnegative();
const percentageSchema = z.number().int().min(0).max(100);

const ballotItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1),
  upVotes: countSchema,
  downVotes: countSchema,
});

export const ballotMetricsSchema = z.object({
  groupName: z.string().min(1),
  period: z.object({
    currentStartedAt: timestampSchema,
    previousStartedAt: timestampSchema.nullable(),
    previousEndedAt: timestampSchema.nullable(),
  }),
  crowdFavourite: ballotItemSchema
    .extend({
      approvalPercent: percentageSchema,
      approvalDeltaPoints: z.number().int().nullable(),
    })
    .nullable(),
  mostDebated: ballotItemSchema
    .extend({
      voteDelta: z.number().int().nullable(),
    })
    .nullable(),
  biggestMover: z
    .object({
      itemId: z.string().uuid(),
      name: z.string().min(1),
      previousRank: z.number().int().positive(),
      currentRank: z.number().int().positive(),
      gain: z.number().int().positive(),
    })
    .nullable(),
  needsCampaign: ballotItemSchema
    .extend({
      netScore: z.number().int(),
      netDelta: z.number().int().nullable(),
    })
    .nullable(),
  turnout: z.object({
    participantCount: countSchema,
    memberCount: countSchema,
    percentage: percentageSchema,
    deltaPoints: z.number().int().nullable(),
  }),
  freshSuggestions: z.object({
    currentCount: countSchema,
    previousCount: countSchema.nullable(),
    delta: z.number().int().nullable(),
  }),
});

export type BallotMetrics = z.infer<typeof ballotMetricsSchema>;

export const fixtureBallotMetrics = {
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
