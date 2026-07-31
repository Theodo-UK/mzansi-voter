import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAvailabilityResponse } from "@/lib/availability";

export async function loadProductAvailability(
  client: SupabaseClient,
  urls: string[],
) {
  const { data, error } = await client.functions.invoke(
    "product-availability",
    { body: { urls } },
  );
  if (error) throw error;
  return parseAvailabilityResponse(urls, data);
}
