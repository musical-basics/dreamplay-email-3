"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const workspaces = [
  "dreamplay_marketing",
  "dreamplay_support",
  "musicalbasics",
  "crossover",
  "concert_marketing",
] as const;

type Workspace = (typeof workspaces)[number];

interface CampaignPayload {
  id: string;
  name: string;
  subject_line?: string;
  html_content?: string;
  variable_values?: Record<string, unknown>;
}

interface CampaignListItem {
  id: string;
  name: string;
  subject_line?: string | null;
  status: string;
  is_template: boolean;
  is_starred_template?: boolean;
  parent_template_id?: string | null;
  scheduled_at?: string | null;
  total_recipients?: number | null;
  updated_at: string;
}

type ListFilter = "drafts" | "templates" | "all";

function sampleHtml() {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;background:#f4f5f7;font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#17181c;">Email preview</h1>
                <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#4b5563;">Load a campaign or paste HTML to review the layout here.</p>
                <a href="{{main_cta_url}}" style="display:inline-block;background:#146ef5;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;">Main CTA</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function formatDate(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function EditorPage() {
  const [workspace, setWorkspace] = useState<Workspace>("dreamplay_marketing");
  const [campaignId, setCampaignId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(sampleHtml());
  const [variableValues, setVariableValues] = useState("{}");
  const [status, setStatus] = useState("Ready.");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [list, setList] = useState<CampaignListItem[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>("drafts");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    const savedKey = window.sessionStorage.getItem("hermes_api_key");
    if (savedKey) setApiKey(savedKey);

    const params = new URLSearchParams(window.location.search);
    const queryWorkspace = params.get("workspace");
    const queryCampaignId = params.get("campaignId");
    if (queryWorkspace && workspaces.includes(queryWorkspace as Workspace)) {
      setWorkspace(queryWorkspace as Workspace);
    }
    if (queryCampaignId) setCampaignId(queryCampaignId);
  }, []);

  const previewDoc = useMemo(() => html || sampleHtml(), [html]);

  const headers = useCallback(() => {
    window.sessionStorage.setItem("hermes_api_key", apiKey);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }, [apiKey]);

  function setMessage(message: string, error = false) {
    setStatus(message);
    setIsError(error);
  }

  const refreshList = useCallback(async () => {
    if (!apiKey) {
      setListError("Enter API key.");
      setList([]);
      return;
    }

    setListLoading(true);
    setListError(null);

    const params = new URLSearchParams();
    params.set("limit", "50");
    if (listFilter === "drafts") {
      params.set("status", "draft");
      params.set("is_template", "false");
    } else if (listFilter === "templates") {
      params.set("is_template", "true");
    }

    try {
      const res = await fetch(`/api/hermes/${workspace}/campaigns?${params.toString()}`, {
        headers: headers(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "List failed");
      setList((payload.data || []) as CampaignListItem[]);
    } catch (error) {
      setListError(error instanceof Error ? error.message : "List failed");
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, [apiKey, workspace, listFilter, headers]);

  useEffect(() => {
    if (apiKey) {
      void refreshList();
    }
  }, [apiKey, workspace, listFilter, refreshList]);

  async function loadCampaignById(id: string) {
    if (!apiKey || !id) {
      setMessage("Enter an API key and campaign ID first.", true);
      return;
    }

    setBusy(true);
    setMessage("Loading campaign...");
    try {
      const res = await fetch(`/api/hermes/${workspace}/campaigns/${id}`, {
        headers: headers(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Load failed");

      const campaign = payload.data as CampaignPayload;
      setCampaignId(campaign.id);
      setName(campaign.name || "");
      setSubject(campaign.subject_line || "");
      setHtml(campaign.html_content || "");
      setVariableValues(JSON.stringify(campaign.variable_values || {}, null, 2));
      setMessage(`Loaded ${campaign.name || campaign.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed", true);
    } finally {
      setBusy(false);
    }
  }

  async function loadCampaign() {
    await loadCampaignById(campaignId);
  }

  async function saveCampaign() {
    if (!apiKey || !campaignId) {
      setMessage("Enter an API key and campaign ID first.", true);
      return;
    }

    let parsedVariableValues: Record<string, unknown>;
    try {
      parsedVariableValues = JSON.parse(variableValues || "{}");
    } catch {
      setMessage("Variable values must be valid JSON.", true);
      return;
    }

    setBusy(true);
    setMessage("Saving campaign...");
    try {
      const res = await fetch(`/api/hermes/${workspace}/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          name,
          subject_line: subject,
          html_content: html,
          variable_values: parsedVariableValues,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Save failed");
      setMessage("Saved.");
      void refreshList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed", true);
    } finally {
      setBusy(false);
    }
  }

  function badgeFor(item: CampaignListItem) {
    if (item.is_template) return { label: "Master Template", className: "badge tpl" };
    if (item.status === "draft") return { label: "Draft", className: "badge draft" };
    if (item.status === "scheduled") return { label: "Scheduled", className: "badge scheduled" };
    if (item.status === "completed") return { label: "Sent", className: "badge sent" };
    if (item.status === "sending") return { label: "Sending", className: "badge sending" };
    return { label: item.status, className: "badge" };
  }

  return (
    <main className="editor-shell">
      <header className="topbar">
        <div>
          <h1>DreamPlay Email 3 Editor</h1>
          <p>Minimal review surface for campaign HTML.</p>
        </div>
        <div className="toolbar">
          <button onClick={loadCampaign} disabled={busy}>
            Load
          </button>
          <button className="primary" onClick={saveCampaign} disabled={busy}>
            Save
          </button>
        </div>
      </header>

      <section className="editor-grid">
        <div className="left-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Campaigns</h2>
              <div className="toolbar">
                <button onClick={refreshList} disabled={listLoading || !apiKey}>
                  {listLoading ? "Loading..." : "Refresh"}
                </button>
              </div>
            </div>
            <div className="filter-tabs">
              <button
                className={listFilter === "drafts" ? "tab active" : "tab"}
                onClick={() => setListFilter("drafts")}
              >
                Drafts
              </button>
              <button
                className={listFilter === "templates" ? "tab active" : "tab"}
                onClick={() => setListFilter("templates")}
              >
                Master Templates
              </button>
              <button
                className={listFilter === "all" ? "tab active" : "tab"}
                onClick={() => setListFilter("all")}
              >
                All
              </button>
            </div>
            <div className="list-body">
              {!apiKey && <div className="list-empty">Enter your Hermes API key below to browse campaigns.</div>}
              {apiKey && listError && <div className="list-empty error">{listError}</div>}
              {apiKey && !listError && list.length === 0 && !listLoading && (
                <div className="list-empty">No campaigns match this filter.</div>
              )}
              <ul className="campaign-list">
                {list.map((item) => {
                  const badge = badgeFor(item);
                  const active = item.id === campaignId;
                  return (
                    <li
                      key={item.id}
                      className={active ? "list-row active" : "list-row"}
                      onClick={() => void loadCampaignById(item.id)}
                    >
                      <div className="list-row-name">{item.name || "(untitled)"}</div>
                      {item.subject_line && <div className="list-row-subject">{item.subject_line}</div>}
                      <div className="list-row-meta">
                        <span className={badge.className}>{badge.label}</span>
                        <span className="list-row-date">{formatDate(item.updated_at)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Campaign</h2>
            </div>
            <div className="panel-body">
              <div className="form-row">
                <label>
                  Workspace
                  <select value={workspace} onChange={(event) => setWorkspace(event.target.value as Workspace)}>
                    {workspaces.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Campaign ID
                  <input value={campaignId} onChange={(event) => setCampaignId(event.target.value)} placeholder="UUID" />
                </label>
              </div>

              <label>
                Hermes API key
                <input
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  type="password"
                  placeholder="Stored in this browser session only"
                />
              </label>

              <label>
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>

              <label>
                Subject line
                <input value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>

              <label>
                Variable values
                <textarea value={variableValues} onChange={(event) => setVariableValues(event.target.value)} />
              </label>

              <label>
                HTML
                <textarea value={html} onChange={(event) => setHtml(event.target.value)} />
              </label>

              <div className={isError ? "status error" : "status"}>{status}</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Preview</h2>
          </div>
          <iframe className="preview-frame" title="Email preview" srcDoc={previewDoc} />
        </div>
      </section>
    </main>
  );
}
