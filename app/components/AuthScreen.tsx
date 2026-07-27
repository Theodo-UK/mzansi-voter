"use client";

import { LockKeyhole, ShoppingBasket } from "lucide-react";

type AuthScreenProps = {
  state: "signed_out" | "loading" | "denied" | "error";
  message?: string;
  onSignIn?: () => void;
};

export function AuthScreen({
  state,
  message,
  onSignIn,
}: AuthScreenProps) {
  const isLoading = state === "loading";
  const heading =
    state === "denied"
      ? "This ballot is for Theodo."
      : state === "error"
        ? "The trolley hit a pothole."
        : "Office groceries without the committee meeting.";

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <a className="brand auth-brand" href="#" aria-label="Mzansi Voter home">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Mzansi Voter</strong>
            <small>The office shop, democratically.</small>
          </span>
        </a>

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
            "Sign in with your Theodo Google account to suggest, vote, and see what makes Friday's trolley."}
        </p>

        {state === "signed_out" ? (
          <button
            type="button"
            className="button button--google"
            onClick={onSignIn}
          >
            <span className="google-mark" aria-hidden="true">
              G
            </span>
            Continue with Google
          </button>
        ) : null}

        {isLoading ? (
          <div className="auth-loading" role="status">
            Checking your office pass…
          </div>
        ) : null}

        <div className="auth-security">
          <LockKeyhole aria-hidden="true" size={15} />
          Only verified @theodo.com accounts can enter.
        </div>
      </section>
    </main>
  );
}
