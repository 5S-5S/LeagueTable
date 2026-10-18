// Visit log: page views, what people search for and JavaScript errors,
// sent to the Worker's /api/log (Workers Analytics Engine - its own free
// allowance, so it never uses up D1 or KV). Loaded first in each page's
// <head>, so errors while the page loads are caught too.
//
// No cookies and nothing that identifies a visitor: the Worker stores the
// page, the event and the country/device it works out from the request,
// never the IP address. Events are queued and sent together when the page
// is hidden or left (one request per visit, usually), with sendBeacon so
// the request outlives the page.
//
// Not sent from localhost / 127.0.0.1 / file: (the checks in tests/ and
// local testing), or from a browser with localStorage noLog=1 (yours:
// localStorage.setItem('noLog', '1') in the console on the live site).
// window.LEAGUE_LOG_ENDPOINT overrides the address (testing against a
// local Worker).
(function () {
    const ENDPOINT = window.LEAGUE_LOG_ENDPOINT
        || 'https://leaguetable-api.league-table-api.workers.dev/api/log';
    const MAX_ERRORS = 5;

    let enabled = !!window.LEAGUE_LOG_ENDPOINT
        || (/^https?:$/.test(location.protocol) && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
    try { if (localStorage.getItem('noLog') === '1') enabled = false; } catch (err) { /* storage blocked */ }

    const queue = [];
    const seenErrors = new Set();
    const beforeFlush = [];

    // event: { kind, outcome, text, ... } - see handleLog in the Worker
    function send(event) {
        if (!enabled) return;
        queue.push({ ...event, page: location.pathname.split('/').pop() || 'index.html' });
        if (queue.length >= 20) flush();
    }

    function flush() {
        // last events first (the search bar's unfinished search)
        beforeFlush.forEach(fn => {
            try { fn(); } catch (err) { /* never block the send */ }
        });
        if (!queue.length) return;
        const body = JSON.stringify({ events: queue.splice(0) });
        // text/plain: a "simple" request, so no CORS preflight
        const blob = new Blob([body], { type: 'text/plain' });
        try {
            if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, blob)) return;
        } catch (err) { /* fall through */ }
        try {
            fetch(ENDPOINT, { method: 'POST', body: blob, keepalive: true }).catch(() => {});
        } catch (err) { /* nothing more to try */ }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);

    // Where an error came from: our own files only (browser extensions and
    // other sites' scripts aren't ours to fix)
    function ownSource(file) {
        if (!file) return '';
        try {
            const url = new URL(file, location.href);
            return url.origin === location.origin ? url.pathname.split('/').pop() || 'index.html' : null;
        } catch (err) {
            return null;
        }
    }

    function reportError(outcome, message, file, line, col, stack) {
        const source = ownSource(file);
        if (source === null) return;
        message = String(message || '').slice(0, 300);
        // "Script error." is a cross-origin error with everything hidden
        if (!message || message === 'Script error.') return;
        const key = `${message}|${source}|${line}`;
        if (seenErrors.has(key) || seenErrors.size >= MAX_ERRORS) return;
        seenErrors.add(key);
        send({
            kind: 'error',
            outcome,
            text: message,
            detail: `${source || location.pathname.split('/').pop() || 'index.html'}${line ? `:${line}:${col || 0}` : ''}`,
            stack: String(stack || '').slice(0, 1000)
        });
    }

    window.addEventListener('error', event => {
        // a failed <img>/<script> load also fires 'error' (not an exception)
        if (!(event instanceof ErrorEvent)) return;
        reportError('error', event.message, event.filename, event.lineno, event.colno, event.error && event.error.stack);
    });
    window.addEventListener('unhandledrejection', event => {
        const reason = event.reason;
        const message = reason && reason.message ? reason.message : String(reason);
        // fetch failing offline / on a dropped connection isn't a bug
        if (/^(Failed to fetch|Load failed|NetworkError when attempting to fetch resource\.?)$/.test(message)) return;
        reportError('rejection', message, location.href, 0, 0, reason && reason.stack);
    });

    // the view, with the site it came from (this site's own host: from another page here)
    let from = '';
    try { from = document.referrer ? new URL(document.referrer).hostname : ''; } catch (err) { /* odd referrer */ }
    send({ kind: 'view', outcome: '', text: from });

    window.LeagueLog = {
        send,
        flush,
        beforeFlush: fn => beforeFlush.push(fn),
        // a desktop page sending a phone to its Mobile page: the visit is
        // the Mobile page's view, not this one's too
        skipView: () => {
            const i = queue.findIndex(event => event.kind === 'view');
            if (i !== -1) queue.splice(i, 1);
        }
    };
})();
