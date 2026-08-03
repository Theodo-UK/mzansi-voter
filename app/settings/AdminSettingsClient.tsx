"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  LogOut,
  ShieldCheck,
  Sparkles,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addGroupAdmin,
  removeGroupAdmin,
} from "@/lib/supabase/repository";
import { isAllowedOfficeEmail } from "@/lib/voting";

type AdminSettingsClientProps = {
  groupId: string;
  groupName: string;
  displayName: string;
  currentEmail: string;
  initialAdminEmails: string[];
};

export function AdminSettingsClient({
  groupId,
  groupName,
  displayName,
  currentEmail,
  initialAdminEmails,
}: AdminSettingsClientProps) {
  const [adminEmails, setAdminEmails] = useState(initialAdminEmails);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingEmail, setRemovingEmail] = useState("");

  async function addAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalisedEmail = email.trim().toLowerCase();
    setMessage("");
    setError("");

    if (!isAllowedOfficeEmail(normalisedEmail)) {
      setError("Use a valid @theodo.com or @aleios.com email address.");
      return;
    }

    if (adminEmails.includes(normalisedEmail)) {
      setMessage(`${normalisedEmail} already has admin access.`);
      setEmail("");
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Admin settings are not configured for this deployment.");
      return;
    }

    setSaving(true);
    try {
      const promotedExistingMember = await addGroupAdmin(
        client,
        groupId,
        normalisedEmail,
      );
      setAdminEmails((current) => [...current, normalisedEmail].sort());
      setEmail("");
      setMessage(
        promotedExistingMember
          ? `${normalisedEmail} is now an admin.`
          : `${normalisedEmail} will become an admin after their first sign-in.`,
      );
    } catch {
      setError("Admin access could not be updated. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function removeAdmin(adminEmail: string) {
    if (
      !window.confirm(
        `Remove admin access for ${adminEmail}? They will remain a member.`,
      )
    ) {
      return;
    }

    setMessage("");
    setError("");
    const client = getSupabaseBrowserClient();
    if (!client) {
      setError("Admin settings are not configured for this deployment.");
      return;
    }

    setRemovingEmail(adminEmail);
    try {
      const demotedExistingMember = await removeGroupAdmin(
        client,
        groupId,
        adminEmail,
      );
      setAdminEmails((current) =>
        current.filter((candidate) => candidate !== adminEmail),
      );
      setMessage(
        demotedExistingMember
          ? `${adminEmail} is now a member.`
          : `${adminEmail} will no longer become an admin at first sign-in.`,
      );
    } catch {
      setError("Admin access could not be removed. Please try again.");
    } finally {
      setRemovingEmail("");
    }
  }

  async function signOut() {
    const client = getSupabaseBrowserClient();
    await client?.auth.signOut();
    window.location.assign("/auth/login");
  }

  return (
    <main className="settings-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Mzansi Voter home">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Mzansi Voter</strong>
            <small>The office shop, democratically.</small>
          </span>
        </Link>
        <div className="account-area">
          <div className="account-copy">
            <span>{displayName}</span>
            <small>{groupName} · Admin</small>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Sign out"
            onClick={() => void signOut()}
          >
            <LogOut aria-hidden="true" size={19} />
          </button>
        </div>
      </header>

      <section className="settings-page" aria-labelledby="settings-title">
        <Link className="settings-back" href="/">
          <ArrowLeft aria-hidden="true" size={15} />
          Back to the ballot
        </Link>

        <div className="settings-heading">
          <span className="eyebrow">Admin settings</span>
          <h1 id="settings-title">Who gets the keys?</h1>
          <p>
            Admins can manage the ballot, staples, shopping cycles, and other
            admins for the {groupName} office.
          </p>
        </div>

        <section className="settings-card" aria-labelledby="admin-access-title">
          <div className="settings-card__heading">
            <span className="settings-card__icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div>
              <h2 id="admin-access-title">Admin access</h2>
              <p>
                Add a Theodo or Aleios colleague now. If they have not signed in
                yet, their access activates on their first Google login.
              </p>
            </div>
          </div>

          <ul className="admin-email-list" aria-label="Configured admins">
            {adminEmails.map((adminEmail) => (
              <li key={adminEmail}>
                <span>{adminEmail}</span>
                <span className="admin-email-actions">
                  <span className="admin-status">
                    <Check aria-hidden="true" size={13} />
                    {adminEmail === currentEmail ? "You" : "Admin"}
                  </span>
                  {adminEmail !== currentEmail ? (
                    <button
                      type="button"
                      className="admin-remove"
                      aria-label={`Remove admin access for ${adminEmail}`}
                      disabled={Boolean(removingEmail)}
                      onClick={() => void removeAdmin(adminEmail)}
                    >
                      <UserMinus aria-hidden="true" size={14} />
                      {removingEmail === adminEmail ? "Removing…" : "Remove"}
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>

          <form className="admin-email-form" onSubmit={addAdmin}>
            <label htmlFor="admin-email">Add another admin</label>
            <div>
              <input
                id="admin-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                required
                placeholder="name.surname@theodo.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button
                type="submit"
                className="button button--primary"
                disabled={saving || !email.trim()}
              >
                <UserPlus aria-hidden="true" size={16} />
                {saving ? "Adding…" : "Add admin"}
              </button>
            </div>
          </form>

          {error ? (
            <p className="settings-message settings-message--error" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="settings-message" role="status">
              {message}
            </p>
          ) : null}
        </section>

        <section className="settings-card" aria-labelledby="release-notes-title">
          <div className="settings-card__heading">
            <span className="settings-card__icon" aria-hidden="true">
              <Sparkles size={22} />
            </span>
            <div>
              <h2 id="release-notes-title">Release notes</h2>
              <p>The latest additions to Mzansi Voter.</p>
            </div>
          </div>

          <ul className="release-notes-list">
            <li>
              <time dateTime="2026-08-03">3 August 2026</time>
              <h3>Comments on every item</h3>
              <p>
                Open an item&apos;s comment thread to discuss it with the office
                and add a little context to your vote.
              </p>
            </li>
            <li>
              <time dateTime="2026-07-31">31 July 2026</time>
              <h3>Ballot Pulse is live</h3>
              <p>
                See crowd favourites, debated items, rank history, turnout,
                and fresh suggestions from real ballot data.
              </p>
            </li>
            <li>
              <time dateTime="2026-07-31">31 July 2026</time>
              <h3>Checkers out-of-stock flags</h3>
              <p>
                Products linked to Checkers are flagged when they are out of
                stock at the Cape Town office store.
              </p>
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}
