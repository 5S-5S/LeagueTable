// Shared gist-fetching/normalizing logic used by both migrate.mjs (one-off
// full backfill) and sync.mjs (daily incremental sync). Mirrors
// processRawData()'s date/goal normalization from the frontend exactly, so
// D1 data matches what's currently rendered from the gists.

import Papa from 'papaparse';

export const DOMESTIC_GIST_URLS = [
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy85OTg4YTEzMzNjNDMwYWFkNTE4ZWJiNDM4YzVkOGRiMS9yYXcvYjliNTM1MGIzZTY3NGE3ODMwY2I3ZDczOWU2MGZhYjQyYjZkNmZlNC9idW5kZXNsaWdhLmNzdg==',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy83NDM1ZmE2OWY1YTYzZDVmM2NjY2E1M2I0ZDA0OWZkZi9yYXcvOGUxNzRlMTJmMjU5YWJiNmY5ZWFlODcxYzY4NGU4OTk2NGIzYjA3My9sYWxpZ2EuY3N2',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy85NDhlMTMwNTYyMGFmM2ExNzJiNDMzOWFiYmEzMWU2Ny9yYXcvYjI0ZjQ3ZTI2ZTUyMDdiYjFkZTM5YTFhZjZkMzg0OThlN2MxNmYzMi9saWd1ZS5jc3Y=',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9iZWFhMWNhYzhmYjM3MDlkYzdjMmY0YmIzZDc5OWI0MS9yYXcvMjk1YmM1ZGI5ZWFjNzcxY2Q3MTdlZmRjZjdmM2JlNWMzNzI0YTE3Yy9zZXJpZWEuY3N2',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9jODk1ZGM3Zjg4MTdiZjM3Y2ZmN2FlOTBjZGEzMWZlMS9yYXcvOTA3OWJkYjZhYWMwNTgzYTM4MGUyYzVhZWNkZDlkNmY5Yjk5OGUzNC9wcmVtLmNzdg==',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9mYTM1M2RmYTExZTE4Mzk1ZmY2NTdmMjE5NmE0NTEyOS9yYXcvNzFiM2U3ZjE0ZjNhYzFlMzA3YjlkMzFjZGU0ZGYzMjkwOGJhZjhkMC8yNTI2cHJlbS5jc3Y=',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy8wMzkyOGU0YThlYTE4OTk4MjZmYTg1MDdkZTdhNzc1My9yYXcvZjFiMjIzYzkyN2RmNTkyMGE3MjNmM2IyZDgyMDRlNmU3NzhjMzg1NC8yNTI2bGFsaWdhLmNzdg==',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9iY2Y2NmE4NzMzMThmODI4NzM2MjE5NGJmNTRlMWM5Yi9yYXcvOTJlNjQzYjk2MTBhMzM1ZTI1YTExOTc5YWFiZDgwYjM0ZmNjNmI0MS8yNTI2c2VyaWVhLmNzdg==',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy84MTc4MDM4ODc0YzgzMjgwNDI1MjdkNDYwYjA2NzdlZC9yYXcvNGE2NjQxMTgzNDcyMzcwYWE1MTEyNzNlZDgxMTg0ZjIyMTZhMDc0Zi8yNTI2YnVuZGVzbGlnYS5jc3Y=',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy8xZjMyODJmNmYwMjQyMjYyMmM0N2I3YTdhNzUxMmM5MS9yYXcvNGQ2ZTkxNGUwODAzNTk1ZmMzZWNmMmIwOGMzZmI0ZWE3ODMzMDZlMC8yNTI2bGlndWUuY3N2',
];

export const CONTINENTAL_MAIN_GIST_URLS = [
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy82MWI1NzlmYTljMzM5MzNmYjRiNzg3YzZhOWQzODhlYy9yYXcvYjA4YTBiZWU4MGNiYWI0MDNkMTdkMzY1MmI0MzRhOTdkNDJkNDQxNy9jaGFtcGlvbnNsZWFndWUuY3N2',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9iMWU1NTcwZTk4NWQ3ZmNhNGRlYWJjYzhhMDA0ZTllMC9yYXcvY2VhNGJmNDJkZjYyZmIxZGZmNzE5YTQ5N2MwZmQ4ZWZkMmQyODhmOS9jaGFtcGlvbnNsZWFndWUyNTI2LmNzdg==',
];

export const CONTINENTAL_QUALIFIER_GIST_URLS = [
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9iYmMyMGMzMmQyNWNjZGMwZmVkZjI1YmM4N2Q0NDY2ZS9yYXcvZjZhNTQ5NDg1YzZlNDNiZWJmNmUzYjZmNmU3NDMyNGFiNDY1YWZjMi9jbHF1YWxpZmllcnMuY3N2',
];

// Strips the commit hash from a gist raw URL so we always fetch the latest
// revision instead of the one pinned at extraction time. Mirrors
// stripGistCommitHash() in the frontend (decodeSingleBase64Url) exactly -
// without this, /raw/<hash>/filename.csv permanently serves whatever
// content existed at that hash, even though the gist keeps getting updated.
function stripGistCommitHash(url) {
    return url.replace(
        /(https:\/\/gist\.githubusercontent\.com\/[^/]+\/[^/]+\/raw\/)([0-9a-f]{40}\/)(.+)/i,
        '$1$3'
    );
}

export function decodeGistUrl(encoded) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return stripGistCommitHash(decoded);
}

// Same day/month/year parsing as processRawData() in the frontend.
export function parseDateToIso(rawDate) {
    const dateStr = String(rawDate).trim().replace(/\r/g, '');
    let dateObj;

    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            if (year < 100) {
                year = year <= 30 ? 2000 + year : 1900 + year;
            }
            dateObj = new Date(Date.UTC(year, month - 1, day));
        }
    } else if (dateStr.includes('-')) {
        dateObj = new Date(dateStr);
    }

    if (!dateObj || isNaN(dateObj.getTime())) return null;
    return dateObj.toISOString().split('T')[0];
}

async function fetchAndParseCsv(encodedUrl) {
    const url = decodeGistUrl(encodedUrl);
    const cacheBusted = `${url}?t=${Date.now()}`;
    const res = await fetch(cacheBusted);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }
    const text = await res.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return parsed.data;
}

function normalizeRow(row) {
    if (!row || !row.HomeTeam || !row.AwayTeam || !row.Date || !row.Div) return null;
    if (typeof row.HomeTeam !== 'string' || typeof row.AwayTeam !== 'string') return null;

    const date = parseDateToIso(row.Date);
    if (!date) return null;

    return {
        div: String(row.Div).trim().replace(/\r/g, ''),
        date,
        homeTeam: String(row.HomeTeam).trim().replace(/\r/g, ''),
        awayTeam: String(row.AwayTeam).trim().replace(/\r/g, ''),
        homeGoals: parseInt(String(row.FTHG ?? '0'), 10) || 0,
        awayGoals: parseInt(String(row.FTAG ?? '0'), 10) || 0,
        competitionPhase: row.CompetitionPhase ? String(row.CompetitionPhase).trim() : null,
        isQualifier: false,
        additionalInfo: row.AdditionalInfo ? String(row.AdditionalInfo).trim() : null,
    };
}

async function collectDomesticMatches() {
    const all = [];
    for (const encoded of DOMESTIC_GIST_URLS) {
        const rows = await fetchAndParseCsv(encoded);
        for (const row of rows) {
            const normalized = normalizeRow(row);
            if (normalized) all.push(normalized);
        }
    }
    return all;
}

async function collectContinentalMatches() {
    const all = [];
    for (const encoded of CONTINENTAL_MAIN_GIST_URLS) {
        const rows = await fetchAndParseCsv(encoded);
        for (const row of rows) {
            const normalized = normalizeRow(row);
            if (normalized) all.push(normalized);
        }
    }
    for (const encoded of CONTINENTAL_QUALIFIER_GIST_URLS) {
        const rows = await fetchAndParseCsv(encoded);
        for (const row of rows) {
            const normalized = normalizeRow(row);
            if (!normalized) continue;
            normalized.isQualifier = true;
            normalized.competitionPhase = normalized.competitionPhase
                ? `Qualification ${normalized.competitionPhase}`
                : 'Qualification';
            all.push(normalized);
        }
    }
    return all;
}

// Fetches and normalizes every match from every gist (both apps). Cheap to
// call - it's just network fetches, no D1 cost - the caller decides how
// much of this to actually write.
export async function collectAllMatches({ log = () => {} } = {}) {
    log('Fetching Domestic gists...');
    const domestic = await collectDomesticMatches();
    log(`  ${domestic.length} rows`);

    log('Fetching Continental gists...');
    const continental = await collectContinentalMatches();
    log(`  ${continental.length} rows`);

    return [...domestic, ...continental];
}
