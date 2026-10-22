"use client";

import { useEffect } from "react";
import {
  CircleAlert,
  ExternalLink,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trash2,
  UnlockKeyhole,
} from "lucide-react";
import {
  formatAvailabilityAge,
  type AvailabilityStatus,
} from "@/lib/availability";
import type { ItemComment, RankedItem, VoteValue } from "@/lib/voting";
import { formatRand } from "@/lib/voting";
import { ItemComments } from "./ItemComments";
import { ProductPreview } from "./ProductPreview";
import { VoteButton } from "./VoteButton";

type ItemCardProps = {
  item: RankedItem;
  availability?: AvailabilityStatus;
  status: "accepted" | "out" | "skipped";
  currentUserId: string;
  isAdmin: boolean;
  votingLocked: boolean;
  onVote: (itemId: string, value: VoteValue) => void;
  onEdit: (item: RankedItem) => void;
  onDelete: (itemId: string) => void;
  onToggleLock: (itemId: string) => void;
  onToggleSkip: (itemId: string) => void;
  comments: ItemComment[];
  onAddComment: (itemId: string, body: string) => void;
  onUpdateComment: (itemId: string, commentId: string, body: string) => void;
  onDeleteComment: (itemId: string, commentId: string) => void;
  commentsOpen: boolean;
  onCommentsOpenChange: (open: boolean) => void;
};

export function ItemCard({
  item,
  availability,
  status,
  currentUserId,
  isAdmin,
  votingLocked,
  onVote,
  onEdit,
  onDelete,
  onToggleLock,
  onToggleSkip,
  comments,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  commentsOpen,
  onCommentsOpenChange,
}: ItemCardProps) {
  const myVote = item.votes.find((vote) => vote.userId === currentUserId)?.value;
  const votingDisabled = votingLocked || item.locked || item.skipped;
  const commentLabel = `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`;

  useEffect(() => {
    if (!commentsOpen) return;

    function closeCommentsOnOutsideClick(event: PointerEvent) {
      const clickedComments = event.composedPath().some(
        (target) =>
          target instanceof Element &&
          (target.classList.contains("item-comments-panel") ||
            target.classList.contains("item-comments-toggle")),
      );

      if (!clickedComments) onCommentsOpenChange(false);
    }

    document.addEventListener("pointerdown", closeCommentsOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeCommentsOnOutsideClick);
  }, [commentsOpen, onCommentsOpenChange]);

  return (
    <li className={`item-card item-card--${status}`}>
      <div className="item-card__summary">
        <div className="item-main">
          <div className="item-title-row">
            <a
              className="item-title"
              href={item.productUrl}
              target="_blank"
              rel="noreferrer"
            >
              {item.name}
              <ExternalLink aria-hidden="true" size={14} />
            </a>
            {item.previewImageUrl ? (
              <ProductPreview
                imageUrl={item.previewImageUrl}
                productName={item.name}
              />
            ) : null}
            <span className="item-price-status">
              <span className="item-price">{formatRand(item.priceCents)}</span>
              {availability === "out_of_stock" ? (
                <span
                  className="item-badge item-badge--out-of-stock"
                  title={formatAvailabilityAge(item.availabilityCheckedAt)}
                >
                  <CircleAlert aria-hidden="true" size={12} />
                  Out of stock
                </span>
              ) : null}
            </span>
          </div>

          <div className="item-meta">
            <span className="item-added-by">Added by {item.createdBy}</span>
            {item.locked ? (
              <span className="item-badge item-badge--locked">
                <LockKeyhole aria-hidden="true" size={12} />
                Staple
              </span>
            ) : null}
            {item.purchaseType === "one_off" ? (
              <span className="item-badge">
                <Sparkles aria-hidden="true" size={12} />
                One-off
              </span>
            ) : null}
            {item.skipped ? <span className="item-badge">Skipped</span> : null}
          </div>
        </div>

        <div className="vote-cluster">
          <VoteButton
            direction={1}
            voters={item.upVoters}
            active={myVote === 1}
            disabled={votingDisabled}
            onVote={(value) => onVote(item.id, value)}
          />
          <output className="vote-score" aria-label={`${item.score} net votes`}>
            {item.score} {Math.abs(item.score) === 1 ? "vote" : "votes"}
          </output>
          <VoteButton
            direction={-1}
            voters={item.downVoters}
            active={myVote === -1}
            disabled={votingDisabled}
            onVote={(value) => onVote(item.id, value)}
          />
        </div>

        <button
          type="button"
          className="item-comments-toggle"
          aria-label={`${commentsOpen ? "Hide" : "View"} ${commentLabel} about ${item.name}`}
          aria-expanded={commentsOpen}
          aria-controls={`comments-${item.id}`}
          onClick={() => onCommentsOpenChange(!commentsOpen)}
        >
          <MessageCircle aria-hidden="true" size={15} />
          {comments.length}
        </button>

        {isAdmin ? (
          <details className="admin-menu">
            <summary aria-label={`Manage ${item.name}`}>
              <MoreHorizontal aria-hidden="true" size={20} />
            </summary>
            <div className="admin-menu__panel">
              <button type="button" onClick={() => onEdit(item)}>
                <Pencil aria-hidden="true" size={15} />
                Edit
              </button>
              <button type="button" onClick={() => onToggleLock(item.id)}>
                {item.locked ? (
                  <UnlockKeyhole aria-hidden="true" size={15} />
                ) : (
                  <LockKeyhole aria-hidden="true" size={15} />
                )}
                {item.locked ? "Unlock" : "Lock"}
              </button>
              <button type="button" onClick={() => onToggleSkip(item.id)}>
                {item.skipped ? (
                  <RotateCcw aria-hidden="true" size={15} />
                ) : (
                  <SkipForward aria-hidden="true" size={15} />
                )}
                {item.skipped ? "Restore" : "Skip cycle"}
              </button>
              <button
                type="button"
                className="danger-action"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 aria-hidden="true" size={15} />
                Delete
              </button>
            </div>
          </details>
        ) : null}
      </div>

      {commentsOpen ? (
        <ItemComments
          itemId={item.id}
          itemName={item.name}
          comments={comments}
          currentUserId={currentUserId}
          onAddComment={onAddComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      ) : null}
    </li>
  );
}
