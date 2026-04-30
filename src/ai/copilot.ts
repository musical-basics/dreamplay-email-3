import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { createAdminClient } from "@/src/lib/supabase";
import { audienceForWorkspace, type Workspace } from "@/src/lib/workspaces";

interface CopilotMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface CopilotInput {
  workspace: Workspace;
  messages: CopilotMessage[];
  currentHtml: string;
  model: string;
}

function safeString(value: unknown) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return JSON.stringify(value);
}

function extractJson(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

async function getContext(workspace: Workspace) {
  const supabase = createAdminClient();
  const audience = audienceForWorkspace(workspace);
  const keys =
    audience === "both"
      ? ["context_crossover", "context_musicalbasics", "context_dreamplay", "links_musicalbasics", "links_dreamplay"]
      : [`context_${audience}`, `links_${audience}`];

  const { data } = await supabase.from("app_settings").select("key,value").in("key", keys);
  const rows = data || [];

  const context = rows
    .filter((row) => String(row.key).startsWith("context_"))
    .map((row) => safeString(row.value))
    .filter(Boolean)
    .join("\n\n");

  const links = rows
    .filter((row) => String(row.key).startsWith("links_"))
    .map((row) => `${row.key}: ${safeString(row.value)}`)
    .join("\n");

  return { context, links };
}

function systemPrompt(context: string, links: string) {
  return `You are an expert email HTML developer for DreamPlay.

Return strict JSON only:
{
  "explanation": "brief summary",
  "updatedHtml": "<!DOCTYPE html>..."
}

Rules:
- Always return a complete HTML email document.
- Use table-based layout suitable for email clients.
- Preserve existing mustache variables like {{first_name}} and {{main_cta_url}}.
- If the user is asking a question instead of asking for an edit, return the original HTML unchanged and put the answer in explanation.
- Do not invent final URLs when configured link variables can be used.

Brand context:
${context || "No brand context is configured."}

Configured links:
${links || "No default links are configured."}`;
}

export async function generateCopilotEmail(input: CopilotInput) {
  const { context, links } = await getContext(input.workspace);
  const system = systemPrompt(context, links);
  const messages = input.messages.length
    ? input.messages
    : [{ role: "user" as const, content: "Create a concise promotional email." }];

  if (input.model.startsWith("gemini")) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = [
      system,
      `Current HTML:\n${input.currentHtml || "(empty)"}`,
      ...messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`),
    ].join("\n\n");

    const result = await ai.models.generateContent({
      model: input.model,
      contents: prompt,
    });
    const text = result.text || "";
    return parseCopilotResult(text, input.currentHtml, input.model);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const anthropicMessages: Anthropic.Messages.MessageParam[] = [
    {
      role: "user",
      content: `Current HTML:\n${input.currentHtml || "(empty)"}`,
    },
    ...messages
      .filter((message) => message.role !== "system")
      .map((message): Anthropic.Messages.MessageParam => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      })),
  ];

  const result = await anthropic.messages.create({
    model: input.model,
    max_tokens: 8000,
    temperature: 0.4,
    system,
    messages: anthropicMessages,
  });

  const text = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  return parseCopilotResult(text, input.currentHtml, input.model);
}

function parseCopilotResult(text: string, currentHtml: string, model: string) {
  try {
    const parsed = JSON.parse(extractJson(text));
    return {
      explanation: parsed.explanation || "Generated email HTML.",
      updatedHtml: parsed.updatedHtml || currentHtml,
      content: parsed.updatedHtml || currentHtml,
      usage: { model },
    };
  } catch {
    return {
      explanation: "Model returned non-JSON text; content is included unchanged.",
      updatedHtml: currentHtml,
      content: text,
      usage: { model },
    };
  }
}
