"use client";

import { useEffect, useMemo, useState } from "react";

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
  preview_text?: string;
  html_content?: string;
  variable_values?: Record<string, unknown>;
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

export default function EditorPage() {
  const [workspace, setWorkspace] = useState<Workspace>("dreamplay_marketing");
  const [campaignId, setCampaignId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [html, setHtml] = useState(sampleHtml());
  const [variableValues, setVariableValues] = useState("{}");
  const [status, setStatus] = useState("Ready.");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

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

  function headers() {
    window.sessionStorage.setItem("hermes_api_key", apiKey);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
  }

  function setMessage(message: string, error = false) {
    setStatus(message);
    setIsError(error);
  }

  async function loadCampaign() {
    if (!apiKey || !campaignId) {
      setMessage("Enter an API key and campaign ID first.", true);
      return;
    }

    setBusy(true);
    setMessage("Loading campaign...");
    try {
      const res = await fetch(`/api/hermes/${workspace}/campaigns/${campaignId}`, {
        headers: headers(),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Load failed");

      const campaign = payload.data as CampaignPayload;
      setName(campaign.name || "");
      setSubject(campaign.subject_line || "");
      setPreviewText(campaign.preview_text || "");
      setHtml(campaign.html_content || "");
      setVariableValues(JSON.stringify(campaign.variable_values || {}, null, 2));
      setMessage(`Loaded ${campaign.name || campaign.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Load failed", true);
    } finally {
      setBusy(false);
    }
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
          preview_text: previewText,
          html_content: html,
          variable_values: parsedVariableValues,
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Save failed");
      setMessage("Saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed", true);
    } finally {
      setBusy(false);
    }
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
              Preview text
              <input value={previewText} onChange={(event) => setPreviewText(event.target.value)} />
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
