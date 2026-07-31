import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAvailabilityResponse } from "@/lib/availability";

export async function loadProductAvailability(
  client: SupabaseClient,
  urls: string[],
) {
  const localUrl = process.env.NEXT_PUBLIC_PRODUCT_AVAILABILITY_URL;
  if (localUrl) {
    const { data: sessionData } = await client.auth.getSession();
    const response = await fetch(localUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls }),
    });
    if (!response.ok) throw new Error("Product availability lookup failed.");
    return parseAvailabilityResponse(urls, await response.json());
  }

  const { data, error } = await client.functions.invoke(
    "product-availability",
    { body: { urls } },
  );
  if (error) throw error;
  return parseAvailabilityResponse(urls, data);
}
