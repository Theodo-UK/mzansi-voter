export const responseHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders,
  });
}

export function requiredEnvironment(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

export async function isAuthenticatedOfficeUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization) return false;

  const supabaseUrl = requiredEnvironment("SUPABASE_URL");
  const publishableKey = requiredEnvironment("SUPABASE_ANON_KEY");
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: publishableKey,
      Authorization: authorization,
    },
  });
  if (!userResponse.ok) return false;

  const user = (await userResponse.json()) as { email?: string };
  const email = user.email?.trim().toLowerCase() ?? "";
  return /^[^@\s]+@(theodo[.]com|aleios[.]com)$/.test(email);
}
