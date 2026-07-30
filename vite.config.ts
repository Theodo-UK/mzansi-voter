import vinext from "vinext";
import { defineConfig, loadEnv } from "vite";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  name: "mzansi-voter",
  main: "./worker/index.ts",
  compatibility_date: "2026-07-28",
  compatibility_flags: ["nodejs_compat"],
  workers_dev: true,
};

export default defineConfig(async ({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const publicSupabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    environment.NEXT_PUBLIC_SUPABASE_URL ??
    "";
  const publicSupabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        command === "build" ? "production" : "development",
      ),
      "process.env.NEXT_PUBLIC_SUPABASE_URL":
        JSON.stringify(publicSupabaseUrl),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY":
        JSON.stringify(publicSupabaseKey),
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
