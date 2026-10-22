import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  closingIn,
  countdownParts,
  extendClosing,
  VotingCountdown,
  votingDeadline,
} from "./VotingCountdown";

function renderCountdown(orderDate: string, isAdmin: boolean) {
  return renderToStaticMarkup(
    <VotingCountdown
      orderDate={orderDate}
      cutoffTime="10:00:00"
      isAdmin={isAdmin}
      onLockedChange={() => undefined}
      onManage={() => undefined}
      onReschedule={() => undefined}
    />,
  );
}

describe("voting countdown", () => {
  it("locks votes at the order time in Cape Town", () => {
    expect(votingDeadline("2026-10-24", "10:00:00").toISOString()).toBe(
      "2026-10-24T08:00:00.000Z",
    );
    expect(votingDeadline("2026-10-24", "10:00").toISOString()).toBe(
      "2026-10-24T08:00:00.000Z",
    );
  });

  it("rounds quick closing times up to the next Cape Town minute", () => {
    const beforeMidnight = Date.parse("2026-10-24T21:59:30.000Z");

    expect(closingIn(1, beforeMidnight)).toEqual({
      orderDate: "2026-10-25",
      cutoffTime: "00:01",
    });
  });

  it("extends from the closing time, or from now once voting has locked", () => {
    const deadline = Date.parse("2026-10-24T08:00:00.000Z");

    expect(extendClosing(deadline, 10, deadline - 60_000)).toEqual({
      orderDate: "2026-10-24",
      cutoffTime: "10:10",
    });
    expect(extendClosing(deadline, 10, deadline + 30 * 60_000)).toEqual({
      orderDate: "2026-10-24",
      cutoffTime: "10:40",
    });
  });

  it("splits the remaining time into whole units", () => {
    expect(countdownParts(90_061_000)).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
    });
    expect(countdownParts(1).seconds).toBe(1);
    expect(countdownParts(-5_000)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it("shows the countdown while the ballot is open", () => {
    const html = renderCountdown("2999-01-01", true);

    expect(html).toContain("Polls close in");
    expect(html).toContain("Change when votes lock");
    expect(html).toContain("+10 min");
    expect(html).not.toContain("Votes are locked");
    expect(renderCountdown("2999-01-01", false)).not.toContain("+10 min");
  });

  it("shows the locked sign once the ballot closes", () => {
    const adminHtml = renderCountdown("2000-01-01", true);
    expect(adminHtml).toContain("Open the next ballot");
    expect(adminHtml).toContain("Reopen for 10 min");

    const memberHtml = renderCountdown("2000-01-01", false);
    expect(memberHtml).toContain("Votes are locked");
    expect(memberHtml).toContain("An admin will open the next ballot.");
  });
});
