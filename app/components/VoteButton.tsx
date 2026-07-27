"use client";

import { useId } from "react";
import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import type { VoteValue } from "@/lib/voting";

type VoteButtonProps = {
  direction: VoteValue;
  voters: string[];
  active: boolean;
  disabled: boolean;
  onVote: (value: VoteValue) => void;
};

export function VoteButton({
  direction,
  voters,
  active,
  disabled,
  onVote,
}: VoteButtonProps) {
  const tooltipId = useId();
  const isUpvote = direction === 1;
  const label = isUpvote ? "upvote" : "downvote";
  const Icon = isUpvote ? ArrowBigUp : ArrowBigDown;
  const detail = voters.length
    ? `${voters.length} ${label}${voters.length === 1 ? "" : "s"}: ${voters.join(", ")}`
    : `No ${label}s yet`;

  return (
    <span className="vote-control">
      <button
        type="button"
        className={`vote-button ${active ? "is-active" : ""}`}
        aria-label={`${active ? "Remove" : "Cast"} ${label}. ${detail}`}
        aria-describedby={tooltipId}
        aria-pressed={active}
        disabled={disabled}
        onClick={() => onVote(direction)}
      >
        <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
      </button>
      <span className="vote-tooltip" id={tooltipId} role="tooltip">
        {detail}
      </span>
    </span>
  );
}
