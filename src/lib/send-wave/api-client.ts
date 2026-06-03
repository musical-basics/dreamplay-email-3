import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "./env";

/** Thin wrapper around the agent API + the email Supabase REST client. */
export type SendWaveClient = {
  /** Workspace this client is scoped to. */
  workspace: string;
  /** Raw fetch helper for /api/agent/{workspace}/... endpoints. */
  api: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
  /** Supabase client for direct campaigns / subscribers reads + patches. */
  sb: SupabaseClient;
};

export type CreateAgentClientOptions = {
  workspace: string;
  /** Base URL of the email app. Defaults to env DREAMPLAY_EMAIL_BASE_URL or production. */
  baseUrl?: string;
  /** Agent API key. Defaults to env AGENT_API_KEY. */
  apiKey?: string;
  /** Supabase URL. Defaults to env NEXT_PUBLIC_SUPABASE_URL. */
  supabaseUrl?: string;
  /** Supabase service key. Defaults to env SUPABASE_SERVICE_KEY. */
  supabaseKey?: string;
};

/**
 * Build an agent client. Reads env vars by default but every value can be
 * overridden. The Supabase URL is asserted to be the email project, not the
 * concerts project, since that misroute has burned several scripts.
 */
export function createAgentClient(opts: CreateAgentClientOptions): SendWaveClient {
  const baseUrl = opts.baseUrl
    ?? process.env.DREAMPLAY_EMAIL_BASE_URL
    ?? "https://dreamplay-email-3.vercel.app";
  const apiKey = opts.apiKey ?? getRequiredEnv("AGENT_API_KEY");
  const supabaseUrl = opts.supabaseUrl ?? getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseKey = opts.supabaseKey ?? getRequiredEnv("SUPABASE_SERVICE_KEY");

  // Defensive check: this SDK is for the email DB, not the concerts/tickets DB.
  if (!supabaseUrl.includes("quyqwdjygzalqqmrgkfk")) {
    throw new Error(
      `Supabase URL ${supabaseUrl} does not look like the email project ` +
        `(expected quyqwdjygzalqqmrgkfk). If you meant the concerts project, the ` +
        `email send pipeline cannot run against it.`,
    );
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const r = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    const t = await r.text();
    if (!r.ok) throw new Error(`${path} -> ${r.status}: ${t}`);
    return (t ? JSON.parse(t) : ({} as T)) as T;
  }

  return { workspace: opts.workspace, api, sb };
}
