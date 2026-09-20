// Shared helper for scripts that call the deployed Worker API repeatedly
// (verify-parity.mjs, verify-head-to-head.mjs). Detects D1's daily quota
// errors and aborts the whole run immediately instead of looping through
// the remaining checks - once the quota trips, every subsequent request
// fails the same way (see backend/README.md's Data integrity section for
// how this bit us once already), so there's no point burning more time or
// requests finding that out one at a time.

export class QuotaExceededError extends Error {}

export async function fetchApiJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        let body = '';
        try { body = await res.text(); } catch {}
        if (/exceeded D1's free tier daily row (read|write) limit/i.test(body)) {
            throw new QuotaExceededError(body.slice(0, 300));
        }
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    return res.json();
}
