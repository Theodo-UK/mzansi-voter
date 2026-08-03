"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlay, Search } from "lucide-react";
import {
  searchGiphy,
  type GiphyResult,
} from "@/lib/giphy";

type GiphyPickerProps = {
  onSelect: (gif: GiphyResult) => void;
};

export function GiphyPicker({ onSelect }: GiphyPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GiphyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "";

  useEffect(() => {
    if (!open) return;

    function closePicker(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closePicker);
    return () => document.removeEventListener("pointerdown", closePicker);
  }, [open]);

  useEffect(() => {
    const search = query.trim();
    if (!open || !apiKey || !search) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void searchGiphy(search, apiKey, controller.signal)
        .then(setResults)
        .catch((reason: unknown) => {
          if (reason instanceof DOMException && reason.name === "AbortError") {
            return;
          }
          setError("GIF search is having a moment.");
          setResults([]);
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [apiKey, open, query]);

  function selectGif(result: GiphyResult) {
    onSelect(result);
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  function updateQuery(value: string) {
    setQuery(value);
    setResults([]);
    setLoading(false);
    setError("");
  }

  return (
    <div ref={containerRef} className="item-comments-giphy">
      <button
        type="button"
        className="item-comments-tool"
        aria-label="Add GIF"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ImagePlay aria-hidden="true" size={14} />
      </button>
      <div className="item-comments-giphy__picker" hidden={!open}>
        <div className="item-comments-giphy__search">
          <Search aria-hidden="true" size={14} />
          <input
            type="search"
            aria-label="Search Giphy"
            maxLength={50}
            placeholder="Search GIFs"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
          />
        </div>
        {!apiKey ? (
          <p>Giphy API key is missing.</p>
        ) : loading ? (
          <p>Searching...</p>
        ) : error ? (
          <p>{error}</p>
        ) : results.length ? (
          <div className="item-comments-giphy__results">
            {results.map((result) => (
              <button
                type="button"
                key={result.id}
                aria-label={`Attach ${result.title || "GIF"}`}
                onClick={() => selectGif(result)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.previewUrl} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        ) : (
          <p>{query.trim() ? "No GIFs found." : "Search for a reaction."}</p>
        )}
        <a
          className="item-comments-giphy__credit"
          href="https://giphy.com"
          target="_blank"
          rel="noreferrer"
        >
          Powered by GIPHY
        </a>
      </div>
    </div>
  );
}
