import { describe, expect, it } from "vitest";
import { canUseFixture, getSupabaseConfig } from "./config";

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

  it("allows fixture data only outside production", () => {
    expect(canUseFixture({ NODE_ENV: "development" })).toBe(true);
    expect(canUseFixture({ NODE_ENV: "test" })).toBe(true);
    expect(canUseFixture({ NODE_ENV: "production" })).toBe(false);
  });

  it("does not use fixture data when Supabase is configured", () => {
    expect(
      canUseFixture({
        NODE_ENV: "development",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-key",
      }),
    ).toBe(false);
  });
});
