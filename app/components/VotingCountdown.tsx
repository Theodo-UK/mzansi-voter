"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Settings2 } from "lucide-react";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const FINALE_MS = 10 * 1000;
const CELEBRATION_MS = 7000;
// South Africa has no daylight saving, so Cape Town is always UTC+02:00.
const CAPE_TOWN_OFFSET_MS = 2 * HOUR_MS;
const FLAG_COLOURS = [
  "#007749",
  "#ffb81c",
  "#de3831",
  "#002395",
  "#000000",
  "#ffffff",
];
const LOCKED_LINES = [
  "Eish, too late! The ballot is closed.",
  "The people have spoken. Sharp sharp!",
  "Ayoba! The trolley is packed.",
  "Votes are in. The snacks are on their way.",
];

function noise(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const CONFETTI = Array.from(
  { length: 90 },
  (_, index) =>
    ({
      "--dx": `${(noise(index, 1) - 0.5) * 110}vw`,
      "--rise": `${-16 - noise(index, 2) * 32}vh`,
      "--spin": `${(noise(index, 3) - 0.5) * 1440}deg`,
      "--delay": `${0.28 + noise(index, 4) * 0.3}s`,
      "--duration": `${2.4 + noise(index, 5) * 1.8}s`,
      background: FLAG_COLOURS[index % FLAG_COLOURS.length],
    }) as CSSProperties,
);

export function votingDeadline(orderDate: string, cutoffTime: string) {
  return new Date(`${orderDate}T${cutoffTime.padEnd(8, ":00")}+02:00`);
}

export function capeTownDateTime(date: Date) {
  const local = new Date(date.getTime() + CAPE_TOWN_OFFSET_MS).toISOString();
  return { orderDate: local.slice(0, 10), cutoffTime: local.slice(11, 16) };
}

export function closingIn(minutes: number, now = Date.now()) {
  const minute = Math.ceil((now + minutes * MINUTE_MS) / MINUTE_MS);
  return capeTownDateTime(new Date(minute * MINUTE_MS));
}

export function countdownParts(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

function formatDeadline(deadline: Date) {
  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Johannesburg",
  }).format(deadline);
}

type VotingCountdownProps = {
  orderDate: string;
  cutoffTime: string;
  isAdmin: boolean;
  onLockedChange: (locked: boolean) => void;
  onManage: () => void;
};

export function VotingCountdown({
  orderDate,
  cutoffTime,
  isAdmin,
  onLockedChange,
  onManage,
}: VotingCountdownProps) {
  const deadlineMs = votingDeadline(orderDate, cutoffTime).getTime();
  const [now, setNow] = useState(() => Date.now());
  const [celebrating, setCelebrating] = useState(false);
  const wasOpen = useRef<boolean>(undefined);
  const remainingMs = deadlineMs - now;
  const locked = remainingMs <= 0;
  const deadline = new Date(deadlineMs);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      const open = deadlineMs > current;
      // Only celebrate a close we watched happen, not one that passed before load.
      if (wasOpen.current && !open) setCelebrating(true);
      wasOpen.current = open;
      setNow(current);
    }, 250);

    return () => window.clearInterval(timer);
  }, [deadlineMs]);

  useEffect(() => onLockedChange(locked), [locked, onLockedChange]);

  useEffect(() => {
    if (!celebrating) return;

    const timer = window.setTimeout(
      () => setCelebrating(false),
      CELEBRATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [celebrating]);

  if (locked) {
    return (
      <>
        <section className="votes-locked" aria-labelledby="votes-locked-title">
          <span className="locked-stamp" aria-hidden="true">
            Votes locked
          </span>
          <div className="votes-locked__copy">
            <h2 id="votes-locked-title">Votes are locked</h2>
            <p>
              The ballot closed on{" "}
              <time dateTime={deadline.toISOString()}>
                {formatDeadline(deadline)}
              </time>
              . Every vote is final for this order.
            </p>
            {isAdmin ? (
              <button
                type="button"
                className="button button--primary"
                onClick={onManage}
              >
                Open the next ballot
              </button>
            ) : (
              <p>An admin will open the next ballot.</p>
            )}
          </div>
        </section>
        {celebrating ? (
          <LockedMoment
            line={
              LOCKED_LINES[
                Math.floor(deadlineMs / MINUTE_MS) % LOCKED_LINES.length
              ]
            }
            onClose={() => setCelebrating(false)}
          />
        ) : null}
      </>
    );
  }

  const { days, hours, minutes, seconds } = countdownParts(remainingMs);
  const phase =
    remainingMs <= MINUTE_MS
      ? "final-minute"
      : remainingMs <= HOUR_MS
        ? "last-call"
        : "open";
  const units: Array<[number, string]> = [
    ...(days ? [[days, days === 1 ? "day" : "days"] as [number, string]] : []),
    [hours, "hrs"],
    [minutes, "min"],
    [seconds, "sec"],
  ];

  return (
    <section
      className="polls-countdown"
      data-phase={phase}
      aria-labelledby="polls-countdown-title"
    >
      <div className="polls-countdown__copy">
        <h2 id="polls-countdown-title">
          {
            {
              open: "Polls close in",
              "last-call": "Last call to vote",
              "final-minute": "Get those votes in!",
            }[phase]
          }
        </h2>
        <p>
          Votes lock on{" "}
          <time dateTime={deadline.toISOString()}>
            {formatDeadline(deadline)}
          </time>
        </p>
        {isAdmin ? (
          <button
            type="button"
            className="polls-countdown__manage"
            onClick={onManage}
          >
            <Settings2 aria-hidden="true" size={13} />
            Change closing time
          </button>
        ) : null}
      </div>
      <div className="polls-countdown__clock" role="timer">
        {units.map(([value, label], index) => (
          <Fragment key={label}>
            {index ? (
              <span className="polls-countdown__colon" aria-hidden="true">
                :
              </span>
            ) : null}
            <span className="polls-countdown__unit">
              <strong>{String(value).padStart(2, "0")}</strong>
              <small>{label}</small>
            </span>
          </Fragment>
        ))}
      </div>
      {remainingMs <= FINALE_MS ? (
        <div className="countdown-finale" aria-hidden="true">
          <span key={seconds}>{seconds}</span>
        </div>
      ) : null}
    </section>
  );
}

function LockedMoment({
  line,
  onClose,
}: {
  line: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="locked-moment"
      aria-labelledby="locked-moment-title"
      onClose={onClose}
    >
      <div className="locked-moment__confetti" aria-hidden="true">
        {CONFETTI.map((style, index) => (
          <i key={index} style={style} />
        ))}
      </div>
      <span className="locked-stamp" aria-hidden="true">
        Votes locked
      </span>
      <h2 id="locked-moment-title">The polls have closed</h2>
      <p>{line}</p>
      <button type="button" className="button" onClick={onClose}>
        Back to the ballot
      </button>
    </dialog>
  );
}
