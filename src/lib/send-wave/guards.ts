/**
 * Pre-send guards. Every one of these exists because a real send broke in a
 * specific way the guard now prevents. Don't strip without reading the audit
 * log entry that introduced the rule.
 */

/** Reject em dashes (— or HTML-entity mdash). Per Lionel's standing style rule. */
export function assertNoEmDash(content: string, label: string): void {
  if (content.includes("—") || content.includes("mdash")) {
    throw new Error(`em dash in ${label}`);
  }
}

/**
 * Reject template placeholders that were meant to be replaced before send
 * (e.g., LANDING_PAGE_URL). Pass any project-specific markers you've used.
 */
export function assertNoPlaceholders(
  content: string,
  label: string,
  placeholders: string[] = ["LANDING_PAGE_URL", "TODO_REPLACE", "subscriber.first_name"],
): void {
  for (const p of placeholders) {
    if (content.includes(p)) {
      throw new Error(`unresolved placeholder "${p}" in ${label}`);
    }
  }
}

/**
 * Verify a scheduledAt timestamp is at least `marginMs` in the future. Default
 * 60_000ms (1 minute). Catches the "I forgot to update SCHEDULED_FIRST_FIRE"
 * mistake before it fires immediately.
 */
export function assertScheduledFresh(scheduledAt: string, marginMs = 60_000): void {
  const t = new Date(scheduledAt).getTime();
  if (Number.isNaN(t)) {
    throw new Error(`scheduledAt "${scheduledAt}" is not a valid ISO timestamp`);
  }
  if (t < Date.now() + marginMs) {
    throw new Error(
      `scheduledAt ${scheduledAt} is too close to now (must be at least ${marginMs}ms in the future)`,
    );
  }
}

/**
 * Strict-enough email regex to catch the local-part-contains-# and
 * missing-TLD cases that have crashed past bulk-tag steps mid-flight.
 */
const EMAIL_RE = /^[A-Za-z0-9._+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email || "");
}

/**
 * Canonicalize an email for de-dup keys. Lower-cases, then collapses Gmail
 * dot-trick and +-suffix on @gmail.com / @googlemail.com.
 */
export function canonicalEmail(email: string): string {
  const e = (email || "").trim().toLowerCase();
  const at = e.indexOf("@");
  if (at < 0) return e;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return e;
}
