import { unstable_noStore as noStore } from "next/cache";
import { createAdminClient } from "@/src/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Workspace =
  | "dreamplay_marketing"
  | "dreamplay_support"
  | "musicalbasics"
  | "crossover"
  | "concert_marketing";

const ALLOWED_WORKSPACES: Workspace[] = [
  "dreamplay_marketing",
  "dreamplay_support",
  "musicalbasics",
  "crossover",
  "concert_marketing",
];

interface CampaignRow {
  id: string;
  name: string | null;
  status: string;
  workspace: string;
  total_recipients: number | null;
  total_opens: number | null;
  total_clicks: number | null;
  is_template: boolean | null;
  parent_template_id: string | null;
  updated_at: string;
}

interface RecipientRow {
  campaign_id: string;
  subscriber_id: string;
  subscribers: { email: string } | { email: string }[] | null;
}

interface EventRow {
  campaign_id: string;
  subscriber_id: string;
}

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 100)}%`;
}

function sinceUtc(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.round(ms / 3_600_000)}h ago`;
  return `${Math.round(ms / 86_400_000)}d ago`;
}

export default async function CampaignsDiagnosticPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  noStore();

  const { w } = await searchParams;
  const workspace: Workspace = ALLOWED_WORKSPACES.includes(w as Workspace)
    ? (w as Workspace)
    : "musicalbasics";

  const supabase = createAdminClient();

  // 1. Fetch completed campaigns for the workspace
  const { data: campaignsData, error: campErr } = await supabase
    .from("campaigns")
    .select(
      "id, name, status, workspace, total_recipients, total_opens, total_clicks, is_template, parent_template_id, updated_at"
    )
    .eq("workspace", workspace)
    .in("status", ["sent", "completed", "active"])
    .eq("is_template", false)
    .order("updated_at", { ascending: false })
    .limit(40);

  const campaigns = (campaignsData ?? []) as CampaignRow[];
  const campaignIds = campaigns.map((c) => c.id);

  // 2. Fetch sent_history for these (per-recipient roll)
  const recipientsByCampaign: Record<string, { subscriber_id: string; email: string }[]> = {};
  if (campaignIds.length > 0) {
    const { data: sentRows } = await supabase
      .from("sent_history")
      .select("campaign_id, subscriber_id, subscribers(email)")
      .in("campaign_id", campaignIds);
    for (const row of (sentRows ?? []) as RecipientRow[]) {
      const subs = row.subscribers;
      const email = Array.isArray(subs) ? subs[0]?.email : subs?.email;
      if (!email) continue;
      if (!recipientsByCampaign[row.campaign_id]) recipientsByCampaign[row.campaign_id] = [];
      const list = recipientsByCampaign[row.campaign_id];
      if (!list.find((r) => r.subscriber_id === row.subscriber_id)) {
        list.push({ subscriber_id: row.subscriber_id, email });
      }
    }
  }

  // 3. Fetch open + click events per campaign.
  // PostgREST + Supabase cap SELECT at ~1000 rows server-side regardless
  // of client .limit(). A bundled .in("campaign_id", [...]) gets silently
  // truncated when older high-volume campaigns saturate the buffer. Per
  // campaign keeps each call well under the cap.
  const opensBySub: Record<string, Set<string>> = {};
  const clicksBySub: Record<string, Set<string>> = {};
  if (campaignIds.length > 0) {
    await Promise.all(
      campaignIds.flatMap((cid) => [
        supabase
          .from("subscriber_events")
          .select("subscriber_id")
          .eq("type", "open")
          .eq("campaign_id", cid)
          .then(({ data }) => {
            if (data && data.length > 0) {
              opensBySub[cid] = new Set(data.map((e: { subscriber_id: string }) => e.subscriber_id));
            }
          }),
        supabase
          .from("subscriber_events")
          .select("subscriber_id")
          .eq("type", "click")
          .eq("campaign_id", cid)
          .then(({ data }) => {
            if (data && data.length > 0) {
              clicksBySub[cid] = new Set(data.map((e: { subscriber_id: string }) => e.subscriber_id));
            }
          }),
      ])
    );
  }

  return (
    <main style={{ background: "#0a0a0a", color: "#e5e5e5", minHeight: "100vh", padding: "24px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "13px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "4px", fontFamily: "system-ui, sans-serif" }}>
        Completed Campaigns (diagnostic)
      </h1>
      <p style={{ color: "#888", marginBottom: "8px", fontFamily: "system-ui, sans-serif" }}>
        Workspace: <strong style={{ color: "#fff" }}>{workspace}</strong> ·
        rendered fresh, no cache. Try: <a href="?w=dreamplay_marketing" style={{ color: "#5aa9ff" }}>dreamplay_marketing</a>
        {" · "}
        <a href="?w=musicalbasics" style={{ color: "#5aa9ff" }}>musicalbasics</a>
      </p>
      {campErr && (
        <p style={{ color: "#ff6b6b" }}>error: {campErr.message}</p>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333", color: "#999" }}>
            <th style={{ textAlign: "left", padding: "8px 6px" }}>Name</th>
            <th style={{ textAlign: "right", padding: "8px 6px" }}>Recipients</th>
            <th style={{ textAlign: "right", padding: "8px 6px" }}>total_opens</th>
            <th style={{ textAlign: "right", padding: "8px 6px" }}>events: opens</th>
            <th style={{ textAlign: "right", padding: "8px 6px" }}>Open Rate</th>
            <th style={{ textAlign: "right", padding: "8px 6px" }}>Click Rate</th>
            <th style={{ textAlign: "right", padding: "8px 6px", color: "#666" }}>updated</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const uOpens = opensBySub[c.id]?.size ?? 0;
            const uClicks = clicksBySub[c.id]?.size ?? 0;
            const recip = c.total_recipients ?? 0;
            return (
              <tr key={c.id} style={{ borderBottom: "1px solid #1f1f1f" }}>
                <td style={{ padding: "8px 6px", color: "#ddd" }}>
                  {c.name ?? c.id}
                  <br />
                  <span style={{ color: "#666", fontSize: "11px" }}>{c.id}</span>
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{recip}</td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{c.total_opens ?? 0}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: uOpens > 0 ? "#7ed957" : "#666" }}>
                  {uOpens}
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: uOpens > 0 ? "#7ed957" : "#666" }}>
                  {pct(uOpens, recip)}
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right" }}>{pct(uClicks, recip)}</td>
                <td style={{ padding: "8px 6px", textAlign: "right", color: "#666", fontSize: "11px" }}>
                  {sinceUtc(c.updated_at)}
                </td>
              </tr>
            );
          })}
          {campaigns.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "#666" }}>
                no completed campaigns in workspace {workspace}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ fontSize: "16px", fontWeight: 700, marginTop: "32px", fontFamily: "system-ui, sans-serif" }}>
        Per-recipient breakdown
      </h2>
      {campaigns.slice(0, 6).map((c) => {
        const recipients = recipientsByCampaign[c.id] ?? [];
        const opens = opensBySub[c.id] ?? new Set();
        const clicks = clicksBySub[c.id] ?? new Set();
        return (
          <details key={c.id} style={{ marginTop: "12px", border: "1px solid #1f1f1f", padding: "8px 12px", borderRadius: "4px" }}>
            <summary style={{ cursor: "pointer", color: "#ccc", fontFamily: "system-ui, sans-serif" }}>
              {c.name ?? c.id}
              <span style={{ color: "#666", marginLeft: "8px" }}>
                ({recipients.length} recipients · {opens.size} opens · {clicks.size} clicks)
              </span>
            </summary>
            <table style={{ width: "100%", marginTop: "8px" }}>
              <thead>
                <tr style={{ color: "#666" }}>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>email</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>opened</th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>clicked</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.subscriber_id}>
                    <td style={{ padding: "3px 6px" }}>{r.email}</td>
                    <td style={{ padding: "3px 6px", color: opens.has(r.subscriber_id) ? "#7ed957" : "#555" }}>
                      {opens.has(r.subscriber_id) ? "✓ Opened" : "—"}
                    </td>
                    <td style={{ padding: "3px 6px", color: clicks.has(r.subscriber_id) ? "#5aa9ff" : "#555" }}>
                      {clicks.has(r.subscriber_id) ? "✓ Clicked" : "—"}
                    </td>
                  </tr>
                ))}
                {recipients.length === 0 && (
                  <tr><td colSpan={3} style={{ padding: "8px", color: "#666" }}>no sent_history rows</td></tr>
                )}
              </tbody>
            </table>
          </details>
        );
      })}
    </main>
  );
}
