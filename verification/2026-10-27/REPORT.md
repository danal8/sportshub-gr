# SportsHub reliability verification — 27 October 2026

## Changes

- `dist/result-reconciliation.js`: cross-date reconciliation is separate from same-day score matching. Requires a unique oriented league pairing and either a shared event ID, or verified ESPN event-detail evidence plus both canonical ESPN club IDs. Cup ties, ambiguous pairings, conflicting IDs and existing finals are preserved.
- `dist/football-leagues.js`: retain ESPN team IDs from the standings source when enriching canonical fixtures.
- `scripts/fixture-evidence.mjs`: checks event detail ID, season, league, home/away IDs, date and final score before allowing a date correction. PSG–Lyon event 401876422 confirms 26 October 2026 19:30 UTC / 21:30 Athens, final 2–0, club IDs 160/167.
- `scripts/refresh-confirmed-results.mjs`: recheck seven source calendar dates, reconcile verified date changes before scores, and stop appending unmatched events to complete schedules. Ambiguous/unmatched entries remain in results-coverage.json.
- `scripts/snapshot-guard.mjs`, `.github/workflows/results.yml`: checkpoint and validate each competition separately, restore the last valid dataset when one competition is invalid, record failures, then build and run the full test suite before publishing. Strict fixture-count tests remain unchanged.
- `scripts/refresh-highlight-fixtures.mjs`, `.github/workflows/highlights.yml`: refresh recent confirmed fixtures before collecting highlights; results-workflow failure no longer skips highlight collection.
- `dist/highlights.js`, `dist/detail-panels.js`: safely use newer confirmed score updates for lookup, retry when a modal's match becomes final, and distinguish an unavailable video from a failed update.
- `dist/core.js`, `dist/app.js`: shared verified aliases and accent/case normalization for fixture and standings search; missing-round label; visible dataset timestamp and integrity/highlights failure messages.
- `scripts/refresh-results.mjs`, `dist/data.js`: Conference production always supplies season 2026-27 and consistently describes partial TheSportsDB/ESPN coverage, with no synthetic standings.
- `scripts/audit-coverage.mjs`: persisted coverage audit across all 17 configured competitions.
- Cache v68 → v69 is one coordinated shell/import revision for changed JavaScript. No user preferences or confirmed-result storage was cleared.
- Regression tests: verified aliases, source evidence, date changes, ambiguous/repeated pairings, repeat execution, newer confirmed finals for highlights, and per-competition rollback.

## Executed checks

`full-refresh-verification.json` records **two complete runs** of the six workflow refresh scripts, build and full tests. Every process exited 0. Both runs retained Ligue 1 306/306 unique IDs, Serie A 380/380, NBA 1200/1200, Elite 240/240, Conference 33/33. The final complete test suite passed **183 tests, 0 failures**.

All nine NBA finals for the Athens day 27 October were compared with ESPN source dates 26 and 27 October. All nine agree; all 30 standings records agree with ESPN, including Miami 0–4. No standings were manually patched or recalculated from an incomplete season. `nba-verification27.json` records the checks; `nba-recaps-verified.json` records all nine verified links.

| Match (home–away) | Final |
|---|---:|
| Charlotte–Washington | 110–103 |
| Cleveland–Minnesota | 127–125 |
| Boston–Chicago | 134–99 |
| Miami–Dallas | 109–113 |
| Milwaukee–Indiana | 110–102 |
| Oklahoma City–Phoenix | 125–114 |
| Houston–Atlanta | 120–110 |
| Utah–Memphis | 105–110 |
| Denver–Golden State | 114–134 |

`check-oct27-ui.mjs` passed at 1280px and 390px: initial football selection SL2, nine NBA final cards and highlight links, Miami modal recap, source standings 0–4, match favourite after reload, identical Greek/English Panathinaikos search with one result, no horizontal overflow and no page errors.

Existing tests also passed: daily loading on throttled network/4× CPU (3074ms desktop, 1529ms mobile in this environment), preference/favourite recovery after full localStorage, modal/list score synchronization and final persistence across reload. Browser UI tests used local published assets with external requests blocked, to isolate reproducible rendering and persistence.

## Limits and remaining source gaps

The coverage report distinguishes missing results from missing videos. A missing video does not prove that a publisher has uploaded one. Conference remains partial (33 events), without a verified full table. Several publisher feeds returned 404/500; earlier verified videos are retained and the UI reports partial highlight-source failures.

GitHub cron does not guarantee its nominal cadence. The UI now displays dataset age, and integrity failures retain the previous dataset with an explicit warning. No guarantee of perpetual zero source failures is made.

An on-demand highlights Edge Function was tested but its upstream NBA/ESPN requests were rejected in that hosting environment. It is **not wired into the application**; only the verified scheduled/bundled/remote-index path is enabled. No database/auth configuration was changed.

Real-time progression of an actual currently running game was not observed in this session; live-to-final behavior was tested using deterministic injected source responses. Screenshots and local command logs remain in test-artifacts and are not part of the deployed application.
