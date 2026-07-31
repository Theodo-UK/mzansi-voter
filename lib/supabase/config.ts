type SupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

const buildEnvironment: SupabaseEnvironment = {
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
