type SupabaseEnvironment = {
  NODE_ENV?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

const buildEnvironment: SupabaseEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

export function getSupabaseConfig(
  environment: SupabaseEnvironment = buildEnvironment,
) {
  const url = environment.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) return null;

  return { url, publishableKey };
}

export function canUseFixture(
  environment: SupabaseEnvironment = buildEnvironment,
) {
  return (
    environment.NODE_ENV !== "production" && !getSupabaseConfig(environment)
  );
}
