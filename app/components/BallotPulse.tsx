import {
  ArrowDown,
  ArrowUp,
  ChartNoAxesColumnIncreasing,
  MessageCircleMore,
  Sparkles,
  Trophy,
  UserRoundCheck,
  WandSparkles,
} from "lucide-react";

export function BallotPulse() {
  return (
    <section className="ballot-pulse" aria-labelledby="ballot-pulse-title">
      <header className="ballot-pulse__heading">
        <div>
          <span className="eyebrow">Ballot pulse · Prototype</span>
          <h1 id="ballot-pulse-title">The office has opinions.</h1>
          <p>
            A quick read on what is loved, debated, and quietly campaigning
            from the bottom.
          </p>
        </div>
        <span className="ballot-pulse__cycle">
          <Sparkles aria-hidden="true" size={14} />
          <span>
            <strong>This week</strong>
            <small>vs 21–27 July</small>
          </span>
        </span>
      </header>

      <div className="ballot-pulse__grid">
        <article className="pulse-card pulse-card--favourite">
          <div className="pulse-card__label">
            <span className="pulse-card__icon">
              <Trophy aria-hidden="true" size={16} />
            </span>
            <span className="pulse-card__label-copy">
              <strong>Crowd favourite</strong>
              <small>Highest approval with 5+ votes</small>
            </span>
          </div>
          <div className="pulse-card__body">
            <div>
              <h2>Dried mango slices</h2>
              <p>9 of 10 voters approve</p>
              <span className="pulse-delta pulse-delta--up">
                +12 pts vs last week
              </span>
            </div>
            <div
              className="pulse-ring"
              role="img"
              aria-label="90 percent approval"
            >
              <span>
                <strong>90%</strong>
                approval
              </span>
            </div>
          </div>
        </article>

        <article className="pulse-card">
          <div className="pulse-card__label">
            <span className="pulse-card__icon">
              <MessageCircleMore aria-hidden="true" size={16} />
            </span>
            <span className="pulse-card__label-copy">
              <strong>Most debated</strong>
              <small>Closest vote split with 5+ votes</small>
            </span>
          </div>
          <h2>Whole milk tart</h2>
          <div
            className="vote-split"
            role="img"
            aria-label="Five upvotes and four downvotes"
          >
            <span className="vote-split__up" />
            <span className="vote-split__down" />
          </div>
          <div className="vote-split__legend">
            <span>
              <ArrowUp aria-hidden="true" size={12} />5 for
            </span>
            <span>
              4 against
              <ArrowDown aria-hidden="true" size={12} />
            </span>
          </div>
          <span className="pulse-delta pulse-delta--up">
            +4 votes vs last week
          </span>
        </article>

        <article className="pulse-card">
          <div className="pulse-card__label">
            <span className="pulse-card__icon">
              <ChartNoAxesColumnIncreasing aria-hidden="true" size={16} />
            </span>
            <span className="pulse-card__label-copy">
              <strong>Biggest mover</strong>
              <small>Largest rank gain since last Friday</small>
            </span>
          </div>
          <div className="pulse-card__headline">
            <div>
              <h2>Naartjies</h2>
              <p>
                <strong>+4</strong> places this week
              </p>
              <span className="pulse-delta pulse-delta--up">From 7th to 3rd</span>
            </div>
            <svg
              className="rank-sparkline"
              viewBox="0 0 104 52"
              aria-hidden="true"
            >
              <path d="M4 44 L27 37 L50 40 L73 22 L100 8" />
              <circle cx="100" cy="8" r="4" />
            </svg>
          </div>
        </article>

        <article className="pulse-card pulse-card--underdog">
          <div className="pulse-card__label">
            <span className="pulse-card__icon">
              <ArrowDown aria-hidden="true" size={16} />
            </span>
            <span className="pulse-card__label-copy">
              <strong>Needs a campaign</strong>
              <small>Lowest net score this week</small>
            </span>
          </div>
          <div className="pulse-card__headline">
            <div>
              <h2>Hummus x2</h2>
              <p>
                <strong>-3</strong> net votes
              </p>
              <span className="pulse-delta pulse-delta--down">
                Down 2 vs last week
              </span>
            </div>
            <div
              className="campaign-tally"
              role="img"
              aria-label="Two upvotes and five downvotes"
            >
              <span className="campaign-tally__up">
                <ArrowUp aria-hidden="true" size={13} />2
              </span>
              <span className="campaign-tally__down">
                <ArrowDown aria-hidden="true" size={13} />5
              </span>
            </div>
          </div>
        </article>

        <article className="pulse-card">
          <div className="pulse-card__label">
            <span className="pulse-card__icon">
              <UserRoundCheck aria-hidden="true" size={16} />
            </span>
            <span className="pulse-card__label-copy">
              <strong>Office turnout</strong>
              <small>Members who cast at least one vote</small>
            </span>
          </div>
          <h2>83% took part</h2>
          <div
            className="turnout-meter"
            role="img"
            aria-label="Ten of twelve members voted"
          >
            <span />
          </div>
          <div className="turnout-meter__legend">
            <span>10 of 12 people</span>
            <span className="pulse-delta pulse-delta--up">
              +9 pts
            </span>
          </div>
        </article>

        <article className="pulse-card pulse-card--fresh">
          <div className="pulse-card__label">
            <span className="pulse-card__icon">
              <WandSparkles aria-hidden="true" size={16} />
            </span>
            <span className="pulse-card__label-copy">
              <strong>Fresh suggestions</strong>
              <small>New items added during the week</small>
            </span>
          </div>
          <div className="pulse-card__headline">
            <div>
              <h2>6 new items</h2>
              <span className="pulse-delta pulse-delta--up">
                +2 vs last week
              </span>
            </div>
            <div
              className="weekly-bars"
              role="img"
              aria-label="Four suggestions last week and six this week"
            >
              <span className="weekly-bars__previous">
                <i />
                <small>4</small>
              </span>
              <span className="weekly-bars__current">
                <i />
                <small>6</small>
              </span>
            </div>
          </div>
        </article>
      </div>

      <p className="ballot-pulse__note">
        Mock numbers for design exploration only. Nothing here is live yet.
      </p>
    </section>
  );
}
