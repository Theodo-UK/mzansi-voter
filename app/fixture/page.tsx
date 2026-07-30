import { notFound } from "next/navigation";
import { AuthBoundary } from "../AuthBoundary";

export default function FixturePage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <AuthBoundary
      fixture
      showDevtools={false}
      insightsHref="/fixture/metrics"
    />
  );
}
