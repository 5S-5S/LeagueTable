// One-time backfill: reads the same gist CSVs the live frontend already
// fetches (the base64 strings below are copied verbatim from
// DomesticEurope.html / ContinentalEurope.html) and emits a SQL file of
// INSERT statements ready for `wrangler d1 execute`.
//
// This mirrors processRawData()'s date/goal normalization from the
// frontend exactly, so the D1 data matches what's currently rendered.
//
// Usage: npm install && node migrate.mjs > ../worker/seed.sql

import Papa from 'papaparse';

const DOMESTIC_GIST_URLS = [
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

const CONTINENTAL_MAIN_GIST_URLS = [
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy82MWI1NzlmYTljMzM5MzNmYjRiNzg3YzZhOWQzODhlYy9yYXcvYjA4YTBiZWU4MGNiYWI0MDNkMTdkMzY1MmI0MzRhOTdkNDJkNDQxNy9jaGFtcGlvbnNsZWFndWUuY3N2',
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9iMWU1NTcwZTk4NWQ3ZmNhNGRlYWJjYzhhMDA0ZTllMC9yYXcvY2VhNGJmNDJkZjYyZmIxZGZmNzE5YTQ5N2MwZmQ4ZWZkMmQyODhmOS9jaGFtcGlvbnNsZWFndWUyNTI2LmNzdg==',
];

const CONTINENTAL_QUALIFIER_GIST_URLS = [
    'aHR0cHM6Ly9naXN0LmdpdGh1YnVzZXJjb250ZW50LmNvbS81Uy01Uy9iYmMyMGMzMmQyNWNjZGMwZmVkZjI1YmM4N2Q0NDY2ZS9yYXcvZjZhNTQ5NDg1YzZlNDNiZWJmNmUzYjZmNmU3NDMyNGFiNDY1YWZjMi9jbHF1YWxpZmllcnMuY3N2',
];

function decodeGistUrl(encoded) {
    return Buffer.from(encoded, 'base64').toString('utf-8');
}

// Same day/month/year parsing as processRawData() in the frontend.
function parseDateToIso(rawDate) {
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

function sqlEscape(value) {
    if (value === null || value === undefined) return 'NULL';
    return `'${String(value).replace(/'/g, "''")}'`;
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

function toInsertStatements(matches, batchSize = 300) {
    const statements = [];
    for (let i = 0; i < matches.length; i += batchSize) {
        const batch = matches.slice(i, i + batchSize);
        const values = batch.map(m => `(${sqlEscape(m.div)}, ${sqlEscape(m.date)}, ${sqlEscape(m.homeTeam)}, ${sqlEscape(m.awayTeam)}, ${m.homeGoals}, ${m.awayGoals}, ${sqlEscape(m.competitionPhase)}, ${m.isQualifier ? 1 : 0})`);
        statements.push(
            `INSERT INTO matches (div, date, home_team, away_team, home_goals, away_goals, competition_phase, is_qualifier) VALUES\n${values.join(',\n')};`
        );
    }
    return statements;
}

async function main() {
    process.stderr.write('Fetching Domestic gists...\n');
    const domestic = await collectDomesticMatches();
    process.stderr.write(`  ${domestic.length} rows\n`);

    process.stderr.write('Fetching Continental gists...\n');
    const continental = await collectContinentalMatches();
    process.stderr.write(`  ${continental.length} rows\n`);

    const all = [...domestic, ...continental];
    process.stderr.write(`Total: ${all.length} rows\n`);

    const statements = toInsertStatements(all);
    console.log(statements.join('\n\n'));
    process.stderr.write(`Wrote ${statements.length} INSERT statements to stdout.\n`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
