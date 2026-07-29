import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BallotPulse } from "../../components/BallotPulse";

export default function MetricsFixturePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" href="/fixture" aria-label="Mzansi Voter fixture">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            <strong>Mzansi Voter</strong>
            <small>The office shop, democratically.</small>
          </span>
        </Link>
        <span className="metrics-preview-badge">Design preview</span>
      </header>

      <main className="metrics-preview-page">
        <Link className="settings-back" href="/fixture">
          <ArrowLeft aria-hidden="true" size={15} />
          Back to the voting list
        </Link>
        <BallotPulse />
      </main>

      <footer className="site-footer">
        <span>Mzansi Voter · Cape Town</span>
        <span>Office groceries, voted lekker.</span>
      </footer>
    </div>
  );
}
