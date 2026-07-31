import type { SupabaseClient } from "@supabase/supabase-js";
import { ballotMetricsSchema } from "@/lib/metrics";

export async function loadBallotMetrics(client: SupabaseClient) {
  const { data, error } = await client.rpc("get_ballot_metrics_with_history");

  if (error) throw error;
  return ballotMetricsSchema.parse(data);
}
