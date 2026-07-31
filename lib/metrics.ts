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
      rankHistory: z
        .array(
          z.object({
            startedAt: timestampSchema,
            rank: z.number().int().positive(),
          }),
        )
        .min(2),
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
