"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import {
  Check,
  Eye,
  Pencil,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import type { ItemComment } from "@/lib/voting";
import {
  createGiphyComment,
  getGiphyMediaUrl,
  readGiphyComment,
  type GiphyResult,
} from "@/lib/giphy";
import { GiphyPicker } from "./GiphyPicker";

type ItemCommentsProps = {
  itemId: string;
  itemName: string;
  comments: ItemComment[];
  currentUserId: string;
  onAddComment: (itemId: string, body: string) => void;
  onUpdateComment: (itemId: string, commentId: string, body: string) => void;
  onDeleteComment: (itemId: string, commentId: string) => void;
};

function scrollToBottom(list: HTMLUListElement | null) {
  if (list) list.scrollTop = list.scrollHeight;
}

const MIN_PANEL_WIDTH = 260;
const MAX_PANEL_WIDTH = 640;
const MIN_PANEL_HEIGHT = 260;
const MAX_PANEL_HEIGHT = 760;

export function ItemComments({
  itemId,
  itemName,
  comments,
  currentUserId,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: ItemCommentsProps) {
  const [draft, setDraft] = useState("");
  const [selectedGif, setSelectedGif] = useState<GiphyResult>();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string>();
  const [editDraft, setEditDraft] = useState("");
  const [panelSize, setPanelSize] = useState<{
    width?: number;
    height?: number;
  }>({});
  const retentionTooltipId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const stopResizeRef = useRef<() => void>(() => undefined);
  const commentsListRef = useRef<HTMLUListElement>(null);
  const emojiContainerRef = useRef<HTMLDivElement>(null);
  const emojiPickerHostRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasGiphyComments = comments.some((comment) =>
    readGiphyComment(comment.body),
  );

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
    const frame = requestAnimationFrame(() =>
      scrollToBottom(commentsListRef.current),
    );
    return () => cancelAnimationFrame(frame);
  }, [comments.length]);

  useEffect(() => {
    const shell = panelRef.current?.closest<HTMLElement>(".ballot-shell");
    if (!shell || !panelSize.width) return;

    shell.style.setProperty("--comments-column-width", `${panelSize.width}px`);
    return () => shell.style.removeProperty("--comments-column-width");
  }, [panelSize.width]);

  useEffect(() => () => stopResizeRef.current(), []);

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
    const body = selectedGif
      ? createGiphyComment(selectedGif.id, draft)
      : draft.trim();
    if (!body) return;
    onAddComment(itemId, body);
    setDraft("");
    setSelectedGif(undefined);
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

  function saveEdit(commentId: string, gifId?: string) {
    const body = gifId ? createGiphyComment(gifId, editDraft) : editDraft.trim();
    if (!body) return;
    onUpdateComment(itemId, commentId, body);
    setEditingCommentId(undefined);
    setEditDraft("");
  }

  function editOnKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    commentId: string,
    gifId?: string,
  ) {
    if (event.key === "Escape") {
      setEditingCommentId(undefined);
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing)
      return;
    event.preventDefault();
    saveEdit(commentId, gifId);
  }

  function clampPanelWidth(width: number) {
    const shellWidth =
      panelRef.current?.closest(".ballot-shell")?.getBoundingClientRect().width ??
      window.innerWidth;
    const availableWidth = window.matchMedia("(min-width: 1180px)").matches
      ? window.innerWidth - shellWidth - 56
      : shellWidth;
    const maxWidth = Math.max(
      MIN_PANEL_WIDTH,
      Math.min(MAX_PANEL_WIDTH, availableWidth),
    );
    return Math.min(maxWidth, Math.max(MIN_PANEL_WIDTH, width));
  }

  function clampPanelHeight(height: number) {
    return Math.min(
      Math.max(MIN_PANEL_HEIGHT, window.innerHeight - 32),
      Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, height)),
    );
  }

  function startResize(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 0 || !panelRef.current) return;
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = panelRef.current.getBoundingClientRect().width;
    const startHeight = panelRef.current.getBoundingClientRect().height;

    function resizePanel(moveEvent: MouseEvent) {
      setPanelSize({
        width: clampPanelWidth(startWidth + startX - moveEvent.clientX),
        height: clampPanelHeight(startHeight + moveEvent.clientY - startY),
      });
    }

    function stopResize() {
      document.removeEventListener("mousemove", resizePanel);
      document.removeEventListener("mouseup", stopResize);
    }

    stopResizeRef.current();
    stopResizeRef.current = stopResize;
    document.addEventListener("mousemove", resizePanel);
    document.addEventListener("mouseup", stopResize);
  }

  function resizeWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    const currentWidth = panelRef.current?.getBoundingClientRect().width;
    const currentHeight = panelRef.current?.getBoundingClientRect().height;
    if (!currentWidth || !currentHeight) return;

    const changesWidth =
      event.key === "ArrowLeft" || event.key === "ArrowRight";
    const changesHeight = event.key === "ArrowUp" || event.key === "ArrowDown";
    if (changesWidth || changesHeight) {
      event.preventDefault();
      setPanelSize((current) => ({
        width: changesWidth
          ? clampPanelWidth(
              currentWidth + (event.key === "ArrowLeft" ? 20 : -20),
            )
          : current.width,
        height: changesHeight
          ? clampPanelHeight(
              currentHeight + (event.key === "ArrowDown" ? 20 : -20),
            )
          : current.height,
      }));
    }
  }

  return (
    <section
      ref={panelRef}
      id={`comments-${itemId}`}
      className="item-comments-panel"
      aria-label={`Comments for ${itemName}`}
      style={
        {
          ...(panelSize.width
            ? { "--comments-panel-width": `${panelSize.width}px` }
            : {}),
          ...(panelSize.height
            ? {
                "--comments-panel-height": `${panelSize.height}px`,
                "--comments-list-max-height": "none",
                "--comments-form-margin-top": "auto",
              }
            : {}),
        } as CSSProperties
      }
    >
      <div
        className="item-comments-resize-handle item-comments-resize-handle--corner"
        role="separator"
        aria-label="Resize comments panel in both directions"
        title="Drag to resize comments"
        tabIndex={0}
        onMouseDown={startResize}
        onKeyDown={resizeWithKeyboard}
      />
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
        {hasGiphyComments ? (
          <a
            className="item-comments-giphy__credit item-comments-giphy__thread-credit"
            href="https://giphy.com"
            target="_blank"
            rel="noreferrer"
          >
            Powered by GIPHY
          </a>
        ) : null}
      </header>

      {comments.length ? (
        <ul ref={commentsListRef}>
          {comments.map((comment, index) => {
            const gif = readGiphyComment(comment.body);
            const isMine = comment.authorId === currentUserId;
            const isEditing = editingCommentId === comment.id;

            return (
              <li key={comment.id}>
                <div className="item-comment-header">
                  <strong>{comment.author}</strong>
                  <span>
                    <time>{comment.time}</time>
                    {isMine ? (
                      <span className="item-comment-actions">
                        <button
                          type="button"
                          aria-label="Edit comment"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditDraft(gif?.caption ?? comment.body);
                          }}
                        >
                          <Pencil aria-hidden="true" size={11} />
                        </button>
                        <button
                          type="button"
                          aria-label="Delete comment"
                          onClick={() => {
                            if (window.confirm("Delete this comment?")) {
                              onDeleteComment(itemId, comment.id);
                            }
                          }}
                        >
                          <Trash2 aria-hidden="true" size={11} />
                        </button>
                      </span>
                    ) : null}
                  </span>
                </div>
                {isEditing ? (
                  <div className="item-comment-edit">
                    <textarea
                      aria-label="Edit comment text"
                      rows={2}
                      maxLength={gif ? 420 : 500}
                      placeholder={gif ? "Add a caption…" : undefined}
                      value={editDraft}
                      onChange={(event) => setEditDraft(event.target.value)}
                      onKeyDown={(event) =>
                        editOnKeyDown(event, comment.id, gif?.id)
                      }
                      autoFocus
                    />
                    <span>
                      <button
                        type="button"
                        aria-label="Cancel editing"
                        onClick={() => setEditingCommentId(undefined)}
                      >
                        <X aria-hidden="true" size={12} />
                      </button>
                      <button
                        type="button"
                        aria-label="Save comment"
                        disabled={!gif && !editDraft.trim()}
                        onClick={() => saveEdit(comment.id, gif?.id)}
                      >
                        <Check aria-hidden="true" size={12} />
                      </button>
                    </span>
                  </div>
                ) : gif ? (
                  <div className="item-comment-gif">
                    {gif.caption ? <p>{gif.caption}</p> : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getGiphyMediaUrl(gif.id)}
                      alt={`GIF shared by ${comment.author}`}
                      loading="lazy"
                      onLoad={
                        index === comments.length - 1
                          ? () => scrollToBottom(commentsListRef.current)
                          : undefined
                      }
                    />
                  </div>
                ) : (
                  <p>{comment.body}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="item-comments-empty">No comments yet. Start the chat.</p>
      )}

      <form onSubmit={submitComment}>
        <label htmlFor={`comment-${itemId}`}>Add a comment</label>
        <div className="item-comments-input-row">
          <div className="item-comments-field">
            {selectedGif ? (
              <div className="item-comments-attachment">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedGif.previewUrl} alt="Attached GIF preview" />
                <span>{selectedGif.title || "GIF attached"}</span>
                <button
                  type="button"
                  aria-label="Remove attached GIF"
                  onClick={() => setSelectedGif(undefined)}
                >
                  <X aria-hidden="true" size={12} />
                </button>
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              id={`comment-${itemId}`}
              rows={1}
              maxLength={selectedGif ? 420 : 500}
              required={!selectedGif}
              placeholder="Comment…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={submitOnEnter}
            />
            <div className="item-comments-tools">
              <GiphyPicker
                onSelect={(gif) => {
                  setSelectedGif(gif);
                  textareaRef.current?.focus();
                }}
              />
              <div ref={emojiContainerRef} className="item-comments-emoji">
                <button
                  type="button"
                  className="item-comments-tool"
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
          </div>
          <button
            type="submit"
            className="button button--primary"
            disabled={!draft.trim() && !selectedGif}
          >
            <Send aria-hidden="true" size={14} />
            Post
          </button>
        </div>
      </form>
    </section>
  );
}
