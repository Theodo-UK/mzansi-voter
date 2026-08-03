"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Eye, Send, SmilePlus } from "lucide-react";
import type { ItemComment } from "@/lib/voting";

type ItemCommentsProps = {
  itemId: string;
  itemName: string;
  comments: ItemComment[];
  onAddComment: (itemId: string, body: string) => void;
};

export function ItemComments({
  itemId,
  itemName,
  comments,
  onAddComment,
}: ItemCommentsProps) {
  const [draft, setDraft] = useState("");
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const retentionTooltipId = useId();
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerHostRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function closeEmojiPicker(event: PointerEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        !emojiContainerRef.current?.contains(target)
      ) {
        setEmojiPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeEmojiPicker);
    return () => document.removeEventListener("pointerdown", closeEmojiPicker);
  }, []);

  useEffect(() => {
    const host = emojiPickerHostRef.current;
    if (!host) return;

    let mounted = true;
    let picker: HTMLElement | undefined;

    function pickEmoji(event: Event) {
      const emoji = (event as CustomEvent<{ emoji: string }>).detail.emoji;
      setDraft((current) => `${current}${emoji}`);
      setEmojiPickerOpen(false);
      textareaRef.current?.focus();
    }

    void import("unicode-emoji-picker").then(
      ({ defineUnicodeEmojiPicker }) => {
        if (!mounted) return;
        if (!window.customElements.get("unicode-emoji-picker")) {
          defineUnicodeEmojiPicker();
        }
        picker = document.createElement("unicode-emoji-picker");
        picker.setAttribute("version", "16.0");
        picker.addEventListener("emoji-pick", pickEmoji);
        host.replaceChildren(picker);
      },
    );

    return () => {
      mounted = false;
      picker?.removeEventListener("emoji-pick", pickEmoji);
      host.replaceChildren();
    };
  }, []);

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onAddComment(itemId, body);
    setDraft("");
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    )
      return;

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  return (
    <section
      id={`comments-${itemId}`}
      className="item-comments-panel"
      aria-label={`Comments for ${itemName}`}
    >
      <header>
        <span className="item-comments-heading">
          <strong>Comments</strong>
          <span className="item-comments-retention">
            <button
              type="button"
              aria-label="About comment retention"
              aria-describedby={retentionTooltipId}
            >
              <Eye aria-hidden="true" size={14} />
            </button>
            <span id={retentionTooltipId} role="tooltip">
              Comments are retained across weeks and are only removed when the
              item is removed.
            </span>
          </span>
        </span>
      </header>

      {comments.length ? (
        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>
              <div>
                <strong>{comment.author}</strong>
                <time>{comment.time}</time>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="item-comments-empty">No comments yet. Start the chat.</p>
      )}

      <form onSubmit={submitComment}>
        <label htmlFor={`comment-${itemId}`}>Add a comment</label>
        <div className="item-comments-input-row">
          <div className="item-comments-field">
            <textarea
              ref={textareaRef}
              id={`comment-${itemId}`}
              rows={1}
              maxLength={500}
              required
              placeholder="Write a comment…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={submitOnEnter}
            />
            <div ref={emojiContainerRef} className="item-comments-emoji">
              <button
                type="button"
                className="item-comments-emoji__trigger"
                aria-label="Add emoji"
                aria-expanded={emojiPickerOpen}
                onClick={() => setEmojiPickerOpen((open) => !open)}
              >
                <SmilePlus aria-hidden="true" size={14} />
              </button>
              <div
                ref={emojiPickerHostRef}
                className="item-comments-emoji__choices"
                hidden={!emojiPickerOpen}
              />
            </div>
          </div>
          <button
            type="submit"
            className="button button--primary"
            disabled={!draft.trim()}
          >
            <Send aria-hidden="true" size={14} />
            Post
          </button>
        </div>
      </form>
    </section>
  );
}
