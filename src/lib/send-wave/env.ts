import { readFileSync } from "fs";

/**
 * Load a .env-style file into process.env without overwriting existing keys.
 * Mirrors the dotenv shim used by every _work/ scheduler script.
 */
export function loadDotEnv(path: string): void {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return; // missing file is a no-op; let getRequiredEnv complain if a key is missing
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    if (process.env[m[1]] !== undefined) continue;
    const v = m[2].replace(/^"(.*)"$/, "$1");
    process.env[m[1]] = v;
  }
}

/** Throw if the named env var is unset or empty. */
export function getRequiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Required env var ${name} is missing or empty`);
  return v;
}
