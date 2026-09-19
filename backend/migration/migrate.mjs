// One-time (or manual re-seed) full backfill: fetches every match from
// every gist and emits a SQL file of INSERT statements ready for
// `wrangler d1 execute`. For the daily incremental sync that actually
// keeps D1 up to date, see sync.mjs instead - this script re-writes the
// entire dataset and is only meant for the initial seed or a full rebuild.
//
// Usage: npm install && node migrate.mjs > ../worker/seed.sql

import { collectAllMatches } from './lib.mjs';

function sqlEscape(value) {
    if (value === null || value === undefined) return 'NULL';
    return `'${String(value).replace(/'/g, "''")}'`;
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
    const all = await collectAllMatches({ log: msg => process.stderr.write(msg + '\n') });
    process.stderr.write(`Total: ${all.length} rows\n`);

    const statements = toInsertStatements(all);
    console.log(statements.join('\n\n'));
    process.stderr.write(`Wrote ${statements.length} INSERT statements to stdout.\n`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
