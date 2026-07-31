import { describe, expect, it } from "vitest";
import { getSupabaseConfig } from "./config";

describe("Supabase configuration", () => {
  it("returns the configured public client values", () => {
    expect(
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "publishable-key",
    });
  });

  it("fails closed when either public client value is absent", () => {
    expect(getSupabaseConfig({})).toBeNull();
    expect(
      getSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      }),
    ).toBeNull();
  });
});
