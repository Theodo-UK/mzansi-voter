import type { CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChartNoAxesColumnIncreasing,
  MessageCircleMore,
  Sparkles,
  Trophy,
  UserRoundCheck,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import type { BallotMetrics } from "@/lib/metrics";

type BallotPulseProps = {
  metrics: BallotMetrics;
};

function signed(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function plural(value: number, word: string) {
  return `${value} ${word}${Math.abs(value) === 1 ? "" : "s"}`;
}

function ordinal(value: number) {
  const remainder = value % 100;
  if (remainder >= 11 && remainder <= 13) return `${value}th`;

  return `${value}${["th", "st", "nd", "rd"][value % 10] ?? "th"}`;
}

function comparisonLabel(metrics: BallotMetrics) {
  const { previousStartedAt, previousEndedAt } = metrics.period;
  if (!previousStartedAt || !previousEndedAt) return "First tracked cycle";

  const formatter = new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Johannesburg",
  });
  const inclusiveEnd = new Date(new Date(previousEndedAt).getTime() - 1);

  return `vs ${formatter.format(new Date(previousStartedAt))} – ${formatter.format(inclusiveEnd)}`;
}

function Delta({
  value,
  unit,
}: {
  value: number | null;
  unit: string;
}) {
  if (value === null) {
    return <span className="pulse-delta pulse-delta--neutral">No prior cycle</span>;
  }

  if (value === 0) {
    return (
      <span className="pulse-delta pulse-delta--neutral">
        No change vs prior cycle
      </span>
    );
  }

  return (
    <span
      className={`pulse-delta pulse-delta--${value > 0 ? "up" : "down"}`}
    >
      {signed(value)} {unit}
      {Math.abs(value) === 1 ? "" : "s"} vs prior cycle
    </span>
  );
}

function MetricLabel({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="pulse-card__label">
      <span className="pulse-card__icon">
        <Icon aria-hidden="true" size={16} />
      </span>
      <span className="pulse-card__label-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </div>
  );
}

export function BallotPulse({ metrics }: BallotPulseProps) {
  const favourite = metrics.crowdFavourite;
  const debated = metrics.mostDebated;
  const mover = metrics.biggestMover;
  const campaign = metrics.needsCampaign;
  const debatedTotal = debated ? debated.upVotes + debated.downVotes : 0;
  const debatedUpPercent = debated
    ? Math.round((100 * debated.upVotes) / debatedTotal)
    : 0;
  const debatedDownPercent = debated ? 100 - debatedUpPercent : 0;
  const suggestionMaximum = Math.max(
    metrics.freshSuggestions.currentCount,
    metrics.freshSuggestions.previousCount ?? 0,
    1,
  );
  const previousSuggestionHeight = Math.round(
    (88 * (metrics.freshSuggestions.previousCount ?? 0)) / suggestionMaximum,
  );
  const currentSuggestionHeight = Math.round(
    (88 * metrics.freshSuggestions.currentCount) / suggestionMaximum,
  );

  return (
    <section className="ballot-pulse" aria-labelledby="ballot-pulse-title">
      <header className="ballot-pulse__heading">
        <div>
          <span className="eyebrow">
            Ballot pulse · Live
          </span>
          <h1 id="ballot-pulse-title">The office has opinions.</h1>
          <p>
            A quick read on what is loved, debated, and quietly campaigning
            from the bottom.
          </p>
        </div>
        <span className="ballot-pulse__cycle">
          <Sparkles aria-hidden="true" size={14} />
          <span>
            <strong>Current cycle</strong>
            <small>{comparisonLabel(metrics)}</small>
          </span>
        </span>
      </header>

      <div className="ballot-pulse__grid">
        <article className="pulse-card pulse-card--favourite">
          <MetricLabel
            icon={Trophy}
            title="Crowd favourite"
            description="Highest approval with 5+ votes"
          />
          <div className="pulse-card__body">
            <div>
              <h2>{favourite?.name ?? "Not enough votes yet"}</h2>
              <p>
                {favourite
                  ? `${favourite.upVotes} of ${favourite.upVotes + favourite.downVotes} voters approve`
                  : "Needs at least 5 votes"}
              </p>
              <Delta
                value={favourite?.approvalDeltaPoints ?? null}
                unit="pt"
              />
            </div>
            <div
              className="pulse-ring"
              role="img"
              aria-label={`${favourite?.approvalPercent ?? 0} percent approval`}
              style={
                {
                  "--pulse-percent": `${favourite?.approvalPercent ?? 0}%`,
                } as CSSProperties
              }
            >
              <span>
                <strong>{favourite?.approvalPercent ?? 0}%</strong>
                approval
              </span>
            </div>
          </div>
        </article>

        <article className="pulse-card">
          <MetricLabel
            icon={MessageCircleMore}
            title="Most debated"
            description="Closest vote split with 5+ votes"
          />
          <h2>{debated?.name ?? "Not enough votes yet"}</h2>
          <div
            className="vote-split"
            role="img"
            aria-label={
              debated
                ? `${plural(debated.upVotes, "upvote")} and ${plural(debated.downVotes, "downvote")}`
                : "No qualifying vote split"
            }
          >
            <span
              className="vote-split__up"
              style={{ width: `${debatedUpPercent}%` }}
            />
            <span
              className="vote-split__down"
              style={{ width: `${debatedDownPercent}%` }}
            />
          </div>
          <div className="vote-split__legend">
            <span>
              <ArrowUp aria-hidden="true" size={12} />
              {debated?.upVotes ?? 0} for
            </span>
            <span>
              {debated?.downVotes ?? 0} against
              <ArrowDown aria-hidden="true" size={12} />
            </span>
          </div>
          <Delta value={debated?.voteDelta ?? null} unit="vote" />
        </article>

        <article className="pulse-card">
          <MetricLabel
            icon={ChartNoAxesColumnIncreasing}
            title="Biggest mover"
            description="Largest rank gain since the previous cycle"
          />
          <div className="pulse-card__headline">
            <div>
              <h2>{mover?.name ?? "No rank gain yet"}</h2>
              <p>
                {mover ? (
                  <>
                    <strong>+{mover.gain}</strong>{" "}
                    {mover.gain === 1 ? "place" : "places"} this cycle
                  </>
                ) : (
                  "Needs a previous cycle to compare"
                )}
              </p>
              {mover ? (
                <span className="pulse-delta pulse-delta--up">
                  From {ordinal(mover.previousRank)} to{" "}
                  {ordinal(mover.currentRank)}
                </span>
              ) : null}
            </div>
            {mover ? (
              <svg
                className="rank-sparkline"
                viewBox="0 0 104 52"
                aria-hidden="true"
              >
                <path d="M4 44 L100 8" />
                <circle cx="4" cy="44" r="3" />
                <circle cx="100" cy="8" r="4" />
              </svg>
            ) : null}
          </div>
        </article>

        <article className="pulse-card pulse-card--underdog">
          <MetricLabel
            icon={ArrowDown}
            title="Needs a campaign"
            description="Lowest net score this cycle"
          />
          <div className="pulse-card__headline">
            <div>
              <h2>{campaign?.name ?? "No votes yet"}</h2>
              <p>
                {campaign ? (
                  <>
                    <strong>{campaign.netScore}</strong>{" "}
                    {Math.abs(campaign.netScore) === 1
                      ? "net vote"
                      : "net votes"}
                  </>
                ) : (
                  "The ballot is still quiet"
                )}
              </p>
              <Delta value={campaign?.netDelta ?? null} unit="net vote" />
            </div>
            <div
              className="campaign-tally"
              role="img"
              aria-label={
                campaign
                  ? `${plural(campaign.upVotes, "upvote")} and ${plural(campaign.downVotes, "downvote")}`
                  : "No votes"
              }
            >
              <span className="campaign-tally__up">
                <ArrowUp aria-hidden="true" size={13} />
                {campaign?.upVotes ?? 0}
              </span>
              <span className="campaign-tally__down">
                <ArrowDown aria-hidden="true" size={13} />
                {campaign?.downVotes ?? 0}
              </span>
            </div>
          </div>
        </article>

        <article className="pulse-card">
          <MetricLabel
            icon={UserRoundCheck}
            title="Office turnout"
            description="Members who cast at least one vote"
          />
          <h2>{metrics.turnout.percentage}% took part</h2>
          <div
            className="turnout-meter"
            role="img"
            aria-label={`${metrics.turnout.participantCount} of ${metrics.turnout.memberCount} members voted`}
          >
            <span style={{ width: `${metrics.turnout.percentage}%` }} />
          </div>
          <div className="turnout-meter__legend">
            <span>
              {metrics.turnout.participantCount} of{" "}
              {metrics.turnout.memberCount} people
            </span>
            <Delta value={metrics.turnout.deltaPoints} unit="pt" />
          </div>
        </article>

        <article className="pulse-card pulse-card--fresh">
          <MetricLabel
            icon={WandSparkles}
            title="Fresh suggestions"
            description="New items added during the cycle"
          />
          <div className="pulse-card__headline">
            <div>
              <h2>
                {plural(metrics.freshSuggestions.currentCount, "new item")}
              </h2>
              <Delta value={metrics.freshSuggestions.delta} unit="item" />
            </div>
            <div
              className="weekly-bars"
              role="img"
              aria-label={`${metrics.freshSuggestions.previousCount ?? 0} suggestions in the previous cycle and ${metrics.freshSuggestions.currentCount} this cycle`}
            >
              <span className="weekly-bars__previous">
                <i style={{ height: `${previousSuggestionHeight}%` }} />
                <small>{metrics.freshSuggestions.previousCount ?? 0}</small>
              </span>
              <span className="weekly-bars__current">
                <i style={{ height: `${currentSuggestionHeight}%` }} />
                <small>{metrics.freshSuggestions.currentCount}</small>
              </span>
            </div>
          </div>
        </article>
      </div>

      <p className="ballot-pulse__note">
        Live ballot totals. Comparisons use the most recently completed cycle.
      </p>
    </section>
  );
}
