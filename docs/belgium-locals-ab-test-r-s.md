# Belgium Locals A/B Test Campaign (R vs. S) Setup

This document outlines the design, configuration, execution details, and analytics tracking for the A/B test campaign targeting local Benelux recipients.

---

## 1. Campaign Metadata & Schedule

* **Scheduled First Fire**: Monday, June 8, 2026, at 2:00 AM EDT (06:00:00 UTC)
* **Target Workspace**: `musicalbasics`
* **Idempotency Tag**: `done-belgium-locals-r-s-2026-06-08` (avoids duplicate sends upon script retries)
* **Parent Campaign ID (Master R)**: `d7ac9f60-9149-4367-b875-b35ff8461ad9`

---

## 2. Variants (Arms)

| Arm | Subject Line | HTML Template | Audience Count | Prospect Tag |
| :--- | :--- | :--- | :--- | :--- |
| **Arm R** | "What I'm playing in Belgium next Thursday" | [email-r.html](file:///Users/test2/Documents/dreamplay-email-3/_work/templates/email-r.html) | 1,047 | `belgium-locals-r-s-2026-06-08:r` |
| **Arm S** | "I thought the trailer would be enough" | [email-s.html](file:///Users/test2/Documents/dreamplay-email-3/_work/templates/email-s.html) | 1,047 | `belgium-locals-r-s-2026-06-08:s` |

### Key Creative Differences:
* **Arm R** focuses on the live program and what Lionel is playing next Thursday.
* **Arm S** focuses on the trailer reaction ("I thought the trailer would be enough") and uses "hundreds of fans" instead of "600 other fans" to describe the audience.

---

## 3. Audience Selection & Partitioning Logic

### Target Audience Criteria:
* Active subscribers in the `musicalbasics` workspace.
* Geographically located in Benelux or neighboring countries (BE, NL, LU, UK, DE, FR).
* Excluded all test accounts (tagged with `"Test Account"`) and anyone who received previous waves.

### Partitioning Process:
* Total clean recipients: **2,094**
* Spanned files: [audience-variant-r.json](file:///Users/test2/Documents/dreamplay-email-3/_work/audience-variant-r.json) and [audience-variant-s.json](file:///Users/test2/Documents/dreamplay-email-3/_work/audience-variant-s.json).
* Recipient lists were split using a deterministic round-robin assignment based on the database UUID of the subscriber. This guarantees:
  1. Equal sizing (exactly 1,047 recipients in each variant).
  2. Zero subscriber overlap between Variant R and Variant S list files.
  3. Stable and reproducible split logic.

---

## 4. Staggered Wave Scheduling

To prevent Vercel rate-limiting, server crashes, or Gmail spam filtering on bulk concurrent sends, the campaign is scheduled in **10 interleaved waves** (5 waves for Arm R, 5 waves for Arm S). 

* **Chunk Size**: 250 recipients per wave
* **Stagger Interval**: 240 seconds (4 minutes) between consecutive wave starts

### Wave Dispatch Timeline (June 8, 2026):

| Wave # | Arm | Chunk Index | Recipients | Scheduled Time (UTC) | Scheduled Time (EDT) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Wave 1** | R | 1 | 250 | 06:00:00 | 02:00:00 |
| **Wave 2** | S | 1 | 250 | 06:04:00 | 02:04:00 |
| **Wave 3** | R | 2 | 250 | 06:08:00 | 02:08:00 |
| **Wave 4** | S | 2 | 250 | 06:12:00 | 02:12:00 |
| **Wave 5** | R | 3 | 250 | 06:16:00 | 02:16:00 |
| **Wave 6** | S | 3 | 250 | 06:20:00 | 02:20:00 |
| **Wave 7** | R | 4 | 250 | 06:24:00 | 02:24:00 |
| **Wave 8** | S | 4 | 250 | 06:28:00 | 02:28:00 |
| **Wave 9** | R | 5 | 47 | 06:32:00 | 02:32:00 |
| **Wave 10** | S | 5 | 47 | 06:36:00 | 02:36:00 |

*Scheduling orchestrated by:* [schedule-locals-r-s.ts](file:///Users/test2/Documents/dreamplay-email-3/_work/schedule-locals-r-s.ts).

---

## 5. Analytics Cookie Attribution Integration

A critical tracking issue was fixed in the [belgium-concert-landing-page](file:///Users/test2/Documents/belgium-concert-landing-page) repository to support this A/B test:

### The Problem:
Previously, the Next.js middleware only set the variant attribution cookie (`ab_v2`) on the root path `/`. When visitors clicked direct links to `/r` or `/s` from the campaign emails, they bypassed the root middleware split. As a result, subsequent checkout or purchase events on `/tickets` were misattributed to Variant A (default control) because the cookie was missing.

### The Fix:
We refactored the proxy middleware in [src/proxy.ts](file:///Users/test2/Documents/belgium-concert-landing-page/src/proxy.ts#L95-L109) to detect direct visits to variant subroutes:
```typescript
  // ── Specific variant landing pages: set the cookie and pass through ──────
  const potentialVariant = pathname.slice(1);
  if (pathname.length === 2 && isVariant(potentialVariant)) {
    const existing = req.cookies.get(AB_COOKIE)?.value;
    if (existing !== potentialVariant) {
      const res = applyCountryCookie(NextResponse.next());
      res.cookies.set(AB_COOKIE, potentialVariant, {
        maxAge: AB_COOKIE_MAX_AGE,
        sameSite: "lax",
        secure: true,
        path: "/",
      });
      return res;
    }
  }
```

Now, when a user lands on `/r` or `/s` from the campaign emails:
1. The `ab_v2` cookie is instantly set to `'r'` or `'s'`.
2. The user is allowed to proceed to the standard landing page template for that path.
3. Checkouts and purchases on `/tickets` read this cookie, enabling 100% accurate conversion tracking back to the email variant they received.
