/**
 * Hosted client-side email attribution script.
 *
 * Served at https://email.dreamplaypianos.com/track-attribution.js so any
 * landing page that an email links to can include
 *
 *   <script src="https://email.dreamplaypianos.com/track-attribution.js" async></script>
 *
 * once and forget about it. The script reads `sid` and `cid` query params
 * from the page URL on load, then fires a fire-and-forget request to the
 * page's own /api/track/click endpoint (same origin as the landing page,
 * not this dp-email-3 domain). The endpoint inserts a click row in
 * subscriber_events.
 *
 * Cache: 5 minutes at the edge so updates here propagate to consumers
 * within ~5 min without rebuilding/redeploying any landing page.
 *
 * The script body itself is intentionally vanilla ES5-ish so it runs in
 * any browser without transpile concerns. Wrapped in an IIFE so it
 * auto-executes when loaded via <script src>.
 */

const SCRIPT_BODY = `(function () {
  if (typeof window === "undefined") return;
  try {
    var params = new URLSearchParams(window.location.search);
    var sid = params.get("sid");
    var cid = params.get("cid");
    if (!sid || !cid) return;

    var url =
      "/api/track/click?c=" + encodeURIComponent(cid) +
      "&s=" + encodeURIComponent(sid) +
      "&u=" + encodeURIComponent(window.location.href);

    // redirect:"manual" so the endpoint's 302 response (intended for
    // server-side redirect-mode clicks) is harmless when received by
    // fetch from the client-side beacon path.
    // mode:"no-cors" because the endpoint is same-origin with the
    // landing page and we don't need response data.
    // keepalive:true so the request is sent even if the user navigates
    // away immediately after page load.
    fetch(url, { redirect: "manual", keepalive: true, mode: "no-cors" })
      .catch(function () {});
  } catch (e) {
    /* swallow — attribution must never break the host page */
  }
})();
`;

export const dynamic = "force-static";

export async function GET() {
  return new Response(SCRIPT_BODY, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // 5-minute cache: short enough that script updates propagate
      // quickly, long enough that we're not regenerating per request.
      "Cache-Control": "public, max-age=300, s-maxage=300, must-revalidate",
      // Permissive CORS so any landing page can <script src> this.
      // Browsers don't enforce CORS on classic <script> tags anyway,
      // but this is a no-cost belt-and-suspenders.
      "Access-Control-Allow-Origin": "*",
    },
  });
}
