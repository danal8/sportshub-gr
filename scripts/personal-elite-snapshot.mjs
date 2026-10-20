// Run manually for this owner's private, non-commercial app only.
// Source personal-copy exception: https://www.eliteleague.gr/oroi-chrisis/ §4.4.
// No scheduled harvesting, logos, images, live scores, or public redistribution.
import {writeFile} from 'node:fs/promises';
import {parseEliteSchedule,parseEliteTable}from'../dist/feeds.js';
const base='https://www.eliteleague.gr/';
const get=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('HTTP '+r.status);return r.text();};
const matches=parseEliteSchedule(await get('schedule/'));
const standings=parseEliteTable(await get('standings/'));
const payload={season:'2026-27',retrievedAt:new Date().toISOString(),source:base+'schedule/',standingsSource:base+'standings/',terms:base+'oroi-chrisis/',copyright:'© Ελληνική Ομοσπονδία Καλαθοσφαίρισης / eliteleague.gr. Μεμονωμένο αντίγραφο μόνο για προσωπική μη εμπορική χρήση (§4.4). Απαγορεύεται η δημόσια αναδιανομή.',matches,standings};
await writeFile(new URL('../dist/snapshots/elite-personal-2026-27.json',import.meta.url),JSON.stringify(payload));console.log({matches:matches.length,standings:standings.length});
