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

interface AssetItem {
  id: string;
  filename: string;
  public_url: string;
  folder_path: string | null;
  is_starred: boolean;
}

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

const VARIABLE_RE = /\{\{(\w+)\}\}/g;
const SYSTEM_VARS = new Set(["first_name", "last_name", "email", "unsubscribe_url"]);
const IMAGE_HINTS = ["img", "image", "logo", "hero", "photo", "banner", "src", "thumbnail", "icon"];

function extractVariables(html: string): string[] {
  const set = new Set<string>();
  let match: RegExpExecArray | null;
  VARIABLE_RE.lastIndex = 0;
  while ((match = VARIABLE_RE.exec(html)) !== null) set.add(match[1]);
  return Array.from(set).sort();
}

function substituteVariables(html: string, values: Record<string, unknown>): string {
  return html.replace(VARIABLE_RE, (match, key: string) => {
    const v = values[key];
    if (v == null || v === "") return match;
    return String(v);
  });
}

function isImageVariable(name: string): boolean {
  const lower = name.toLowerCase();
  return IMAGE_HINTS.some((hint) => lower.includes(hint));
}

function safeParseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore
  }
  return {};
}

const LS_WORKSPACE = "editor.workspace";
const LS_CAMPAIGN_ID = "editor.campaignId";

export default function EditorPage() {
  const [workspace, setWorkspace] = useState<Workspace>("dreamplay_marketing");
  const [campaignId, setCampaignId] = useState("");
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

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [assetStarredOnly, setAssetStarredOnly] = useState(false);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryWorkspace = params.get("workspace");
    const queryCampaignId = params.get("campaignId");

    let ws: Workspace = "dreamplay_marketing";
    let id = "";

    if (queryWorkspace && workspaces.includes(queryWorkspace as Workspace)) {
      ws = queryWorkspace as Workspace;
    } else {
      try {
        const stored = window.localStorage.getItem(LS_WORKSPACE);
        if (stored && workspaces.includes(stored as Workspace)) ws = stored as Workspace;
      } catch {
        // ignore
      }
    }

    if (queryCampaignId) {
      id = queryCampaignId;
    } else {
      try {
        id = window.localStorage.getItem(LS_CAMPAIGN_ID) || "";
      } catch {
        // ignore
      }
    }

    setWorkspace(ws);
    setCampaignId(id);

    if (id) {
      void loadCampaignById(id, ws);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsedVariableValues = useMemo(() => safeParseObject(variableValues), [variableValues]);

  const detectedVars = useMemo(() => extractVariables(html), [html]);

  const previewDoc = useMemo(
    () => substituteVariables(html || sampleHtml(), parsedVariableValues),
    [html, parsedVariableValues]
  );

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
    }),
    []
  );

  function setMessage(message: string, error = false) {
    setStatus(message);
    setIsError(error);
  }

  async function readJsonOrThrow(res: Response, fallback: string) {
    const text = await res.text();
    let payload: { data?: unknown; error?: string } | null = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
      }
    }
    if (!res.ok) {
      throw new Error(payload?.error || `${fallback} (status ${res.status})`);
    }
    if (!payload) {
      throw new Error(`Empty response (status ${res.status})`);
    }
    return payload;
  }

  const refreshList = useCallback(async () => {
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
      const res = await fetch(`/api/editor/${workspace}/campaigns?${params.toString()}`, {
        headers: headers(),
      });
      const payload = await readJsonOrThrow(res, "List failed");
      setList(((payload.data as CampaignListItem[]) || []));
    } catch (error) {
      setListError(error instanceof Error ? error.message : "List failed");
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, [workspace, listFilter, headers]);

  useEffect(() => {
    void refreshList();
  }, [workspace, listFilter, refreshList]);

  const refreshAssets = useCallback(async () => {
    setAssetLoading(true);
    setAssetError(null);
    const params = new URLSearchParams();
    params.set("limit", "120");
    if (assetSearch.trim()) params.set("search", assetSearch.trim());
    if (assetStarredOnly) params.set("starred", "true");
    try {
      const res = await fetch(`/api/editor-assets?${params.toString()}`, { headers: headers() });
      const payload = await readJsonOrThrow(res, "Asset list failed");
      setAssets(((payload.data as AssetItem[]) || []));
    } catch (error) {
      setAssetError(error instanceof Error ? error.message : "Asset list failed");
      setAssets([]);
    } finally {
      setAssetLoading(false);
    }
  }, [assetSearch, assetStarredOnly, headers]);

  useEffect(() => {
    void refreshAssets();
  }, [assetStarredOnly, refreshAssets]);

  function setVariableValue(key: string, value: string) {
    const next = { ...parsedVariableValues };
    if (value === "") delete next[key];
    else next[key] = value;
    setVariableValues(JSON.stringify(next, null, 2));
  }

  function pickAsset(asset: AssetItem) {
    if (pickerTarget) {
      setVariableValue(pickerTarget, asset.public_url);
      setPickerTarget(null);
    } else {
      void navigator.clipboard?.writeText(asset.public_url);
      setMessage(`Copied URL for ${asset.filename}.`);
    }
  }

  async function loadCampaignById(id: string, ws: Workspace = workspace) {
    if (!id) {
      setMessage("Enter a campaign ID first.", true);
      return;
    }

    setBusy(true);
    setMessage("Loading campaign...");
    try {
      const res = await fetch(`/api/editor/${ws}/campaigns/${id}`, {
        headers: headers(),
      });
      const payload = await readJsonOrThrow(res, "Load failed");
      const campaign = payload.data as CampaignPayload;
      setCampaignId(campaign.id);
      setName(campaign.name || "");
      setSubject(campaign.subject_line || "");
      setHtml(campaign.html_content || "");
      setVariableValues(JSON.stringify(campaign.variable_values || {}, null, 2));
      setMessage(`Loaded ${campaign.name || campaign.id}.`);
      try {
        window.localStorage.setItem(LS_WORKSPACE, ws);
        window.localStorage.setItem(LS_CAMPAIGN_ID, campaign.id);
      } catch {
        // localStorage unavailable, ignore
      }
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
    if (!campaignId) {
      setMessage("Enter a campaign ID first.", true);
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
      const res = await fetch(`/api/editor/${workspace}/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          name,
          subject_line: subject,
          html_content: html,
          variable_values: parsedVariableValues,
        }),
      });
      await readJsonOrThrow(res, "Save failed");
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
                <button onClick={refreshList} disabled={listLoading}>
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
              {listError && <div className="list-empty error">{listError}</div>}
              {!listError && list.length === 0 && !listLoading && (
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
                  <select
                    value={workspace}
                    onChange={(event) => {
                      const next = event.target.value as Workspace;
                      setWorkspace(next);
                      try {
                        window.localStorage.setItem(LS_WORKSPACE, next);
                      } catch {
                        // ignore
                      }
                    }}
                  >
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
                Name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>

              <label>
                Subject line
                <input value={subject} onChange={(event) => setSubject(event.target.value)} />
              </label>

              <div className="vars-section">
                <div className="vars-header">
                  <span className="vars-title">Variables</span>
                  <span className="vars-hint">{detectedVars.length} found in HTML</span>
                </div>
                {detectedVars.length === 0 && (
                  <div className="vars-empty">No <code>{"{{"}variables{"}}"}</code> found in the HTML.</div>
                )}
                {detectedVars.map((key) => {
                  const isImage = isImageVariable(key);
                  const isSystem = SYSTEM_VARS.has(key);
                  const value = parsedVariableValues[key];
                  const stringValue = typeof value === "string" ? value : value == null ? "" : JSON.stringify(value);
                  return (
                    <div key={key} className="var-row">
                      <label className="var-label">
                        <span className="var-name">
                          {`{{${key}}}`}
                          {isSystem && <span className="var-tag">system</span>}
                          {isImage && !isSystem && <span className="var-tag image">image</span>}
                        </span>
                        <input
                          value={stringValue}
                          onChange={(event) => setVariableValue(key, event.target.value)}
                          placeholder={isSystem ? "Filled at send time" : isImage ? "Image URL" : "value"}
                        />
                      </label>
                      {isImage && !isSystem && (
                        <button type="button" className="var-pick" onClick={() => setPickerTarget(key)}>
                          Pick image
                        </button>
                      )}
                    </div>
                  );
                })}
                <details className="vars-raw">
                  <summary>Raw JSON</summary>
                  <textarea
                    value={variableValues}
                    onChange={(event) => setVariableValues(event.target.value)}
                    spellCheck={false}
                  />
                </details>
              </div>

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

      {pickerTarget && (
        <div className="modal-backdrop" onClick={() => setPickerTarget(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Pick an image</h3>
                <p>
                  Selecting will set <code>{`{{${pickerTarget}}}`}</code>.
                </p>
              </div>
              <button onClick={() => setPickerTarget(null)}>Close</button>
            </div>
            <div className="modal-toolbar">
              <input
                value={assetSearch}
                onChange={(event) => setAssetSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void refreshAssets();
                }}
                placeholder="Search by filename"
              />
              <label className="checkbox-inline">
                <input
                  type="checkbox"
                  checked={assetStarredOnly}
                  onChange={(event) => setAssetStarredOnly(event.target.checked)}
                />
                Starred only
              </label>
              <button onClick={refreshAssets} disabled={assetLoading}>
                {assetLoading ? "Loading..." : "Search"}
              </button>
            </div>
            <div className="modal-body">
              {assetError && <div className="list-empty error">{assetError}</div>}
              {!assetError && assets.length === 0 && !assetLoading && (
                <div className="list-empty">No assets match.</div>
              )}
              <div className="asset-grid">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className="asset-card"
                    onClick={() => pickAsset(asset)}
                    title={asset.filename}
                  >
                    <div className="asset-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.public_url} alt={asset.filename} loading="lazy" />
                      {asset.is_starred && <span className="asset-star">★</span>}
                    </div>
                    <div className="asset-name">{asset.filename}</div>
                    {asset.folder_path && <div className="asset-folder">{asset.folder_path}</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
