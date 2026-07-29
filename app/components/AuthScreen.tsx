"use client";

import { LockKeyhole, ShoppingBasket } from "lucide-react";
import Link from "next/link";

type AuthScreenProps = {
  state: "loading" | "denied" | "error";
  message?: string;
};

export function AuthScreen({ state, message }: AuthScreenProps) {
  const isLoading = state === "loading";
  const heading =
    state === "denied"
      ? "This ballot is for the office crew."
      : state === "error"
        ? "The trolley hit a pothole."
        : "Office groceries without the committee meeting.";

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <Link className="brand auth-brand" href="/" aria-label="Mzansi Voter home">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Mzansi Voter</strong>
            <small>The office shop, democratically.</small>
          </span>
        </Link>

        <div className="auth-visual" aria-hidden="true">
          <ShoppingBasket size={54} strokeWidth={1.4} />
          <span>1</span>
          <span>2</span>
          <span>3</span>
        </div>

        <span className="eyebrow">Cape Town office ballot</span>
        <h1>{heading}</h1>
        <p>
          {message ??
            "Sign in with your Theodo or Aleios Google account to suggest, vote, and see what makes Friday's trolley."}
        </p>

        {isLoading ? (
          <div className="auth-loading" role="status">
            Checking your office pass…
          </div>
        ) : null}

        <div className="auth-security">
          <LockKeyhole aria-hidden="true" size={15} />
          Only verified @theodo.com or @aleios.com accounts can enter.
        </div>
      </section>
    </main>
  );
}
