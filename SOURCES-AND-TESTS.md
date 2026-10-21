# Έλεγχοι SportsHub GR — 20/10/2026

## Αυτοματοποιημένα

19 δοκιμές επιτυχείς (`npm test`). Καλύπτουν απόρριψη λάθος διοργάνωσης / σεζόν, μη πλήρων πηγών, μη ορισμένων ωρών, αλλαγή έτους και ζώνης ώρας, ισοβαθμίες / ομίλους, διατήρηση δημοσιευμένων βαθμών και παράλειψη live scores / στοιχείων επικοινωνίας από το EuroLeague API. Ελέγχονται επίσης φίλτρα, ασφαλές HTML, manifest, πραγματικές διαστάσεις PNG και offline assets.

## Πραγματικές δοκιμές πηγών

- Elite League: HTTP 200, 240 αγώνες / 30 αγωνιστικές, 16 γραμμές κατάταξης, 25 ρητοί σύνδεσμοι διαδικτυακής μετάδοσης.
- ΕΣΑΚΕ: HTTP 200, 182 αγώνες / 26 αγωνιστικές, 14 γραμμές κατάταξης. Κατά τον έλεγχο 92 αγώνες είχαν ορισμένη ημερομηνία και 91 καταχωρισμένο κανάλι. Οι υπόλοιποι παραμένουν μη ορισμένοι.
- EuroLeague επίσημο API: HTTP 200, 380 αγώνες κανονικής περιόδου και 20 γραμμές επίσημης κατάταξης.
- EuroCup επίσημο API: HTTP 200, 224 αγώνες κανονικής περιόδου και 32 γραμμές κατάταξης με ομίλους.
- Super League: openfootball / CC0 182 αγώνες και 26 αγωνιστικές. Wikipedia κοινοτική κατάταξη 14 ομάδων, έκδοση 1380987677 κατά την αρχική δοκιμή.
- Champions / Europa / Conference League: Wikipedia API HTTP 200, αντίστοιχα 144 / 144 / 108 αγώνες φάσης πρωταθλήματος και 36 ομάδες ανά πίνακα. Αρχικές εκδόσεις 1380990679 / 1381148488 / 1381149971.
- openfootball διεθνή JSON: Premier League 380, La Liga 380, Bundesliga 306 αγώνες. Άδεια CC0, CORS διαθέσιμο.
- TheSportsDB: HTTP 200 σε τεκμηριωμένες V1 διαδρομές, δωρεάν όρια έως 15 αγώνων σεζόν / 1 επόμενου / 5 γραμμών κατάταξης. Δείγματα περιλαμβάνονται μόνο ως ρητά μερική εφεδρεία. Εμφανίστηκαν και HTTP 429· δεν παρακάμφθηκαν. Η λειτουργική εφαρμογή απλώνει τα αιτήματα του εφεδρικού provider και χρησιμοποιεί προσωρινή μνήμη.
- TheSportsDB ημερήσια TV για Ελλάδα: HTTP 200 με κενό σώμα. Δεν δηλώνεται ως διαθέσιμος πλήρης τηλεοπτικός οδηγός.

Οι προηγούμενες αποτυχίες 403 / 429 στις κύριες σελίδες Super League / EuroLeague δεν αντιμετωπίστηκαν με παράκαμψη. Χρησιμοποιήθηκαν άλλες προσβάσιμες πηγές: CC0 / CC BY-SA και το διαθέσιμο επίσημο API. Η άδεια κώδικα τρίτου wrapper δεν θεωρήθηκε άδεια δεδομένων. Πηγές και όροι αναφέρονται αναλυτικά στο README και μέσα στην εφαρμογή.

## Browser και PWA

Ελέγχθηκαν desktop sidebar, mobile κάτω navigation, tabs, αναζήτηση, αγωνιστικές, αγαπημένα και διατήρησή τους μετά από reload. Επιβεβαιώθηκε φόρτωση από cache με σταματημένο localhost server. Αυτό δεν αποτελεί δοκιμή airplane mode σε Android. Η πρώτη έκδοση HTTPS επιβεβαιώθηκε με επιτυχή δημοσίευση· η τελική έκδοση αναβαθμίζεται σε Worker με αυτόματη ανάκτηση πηγών.

Το αρχικό mockup δεν επιστράφηκε από τη μεταφερμένη συνομιλία, επομένως δεν έχει αποδειχθεί pixel-perfect ταύτιση. Δεν έχει εκτελεστεί φυσική εγκατάσταση Android ή PC. Η πλήρης ελληνική TV πέρα από τις ρητές αναφορές ΕΟΚ / ΕΣΑΚΕ παραμένει κενό κάλυψης.

## GitHub Pages reliability verification · 2026-10-21

Based exclusively on fresh main 5d883d86dfd78c078e2b1df685f869f1b8b5e025.

- TV requests the Novasports AJAX template with dt=YYYY-MM-DD. Each day has its own cache key and normalized fallback snapshot. Explicit live markers only; repeats excluded. Dates with unpublished upstream listings are not fabricated.
- Volleyball women: EOPE Sportspress league 11, season 298; 132 matches / 22 rounds. Federation JSON accepts the GitHub Pages Origin via CORS. Pages reads same-origin snapshots on first load, then refreshes directly from EOPE. Standings failures do not discard fixtures.
- Volleyball men: ESAP 2026-27 official schedule; 132 matches / 22 rounds. Included in TV when an explicit channel is provided.
- OpenLigaDB and Euroleague season snapshots replace former small SportsDB fallback subsets. Browser refreshes supported public CORS sources every 90 seconds while visible. Stale scores never retain LIVE labels. SL current scores can be overlaid from ESPN Greek Super League scoreboard, with explicit state and season checks.
- NBA: ESPN standings season=2027 (2026–27), 30 teams / two conferences, source ranks and win percentages.
- Super League badges: all 14 official PNG files are hosted locally. File-signature recognition handles missing upstream Content-Type. Existing cached logos survive upstream 429 failures.
- Default build now prepares docs/ for GitHub Pages. No private backend URL or /api fetch is used by the public provider. No worker hosting deployment is performed.
- Scheduled refresh: every five minutes, subject to GitHub Actions scheduling delays; source updates are validated before committing. Tests and Pages build gate updates.
- Verification: 47 Node tests, Pages build, JavaScript syntax checks, browser TV Friday / volleyball women / NBA standings / all 14 visible SL badges loaded; no browser console errors.

## Competition and mobile refinements · 2026-10-21

Defaults: SL2 / Elite League A2 / women volleyball / SL2 standings. Remaining choices sorted alphabetically. NBA now includes 1,200 published regular-season fixtures (30 teams, source ESPN), with Athens dates and times, a date selector and current-score refresh. Team schedules refresh daily; scoreboard and standings refresh on the existing schedule. Unannounced Cup fixtures are not invented. Serie A: 380 fixtures / 20-team ESPN table. Ligue 1: 306 fixtures / 18-team ESPN table. All 38 club crests verified as local files, including Greek TV aliases. TV uses compact mobile typography and a 174px desktop date control. Requested indicative-table notice removed. Validation: 52 tests, Pages build, browser NBA fixtures / A2 and SL2 defaults / Serie A table, and 399px mobile TV inspection.

## TV scores, bookmaker prices and spacing · 2026-10-21

Favourite buttons, filtering controls and promotional card are temporarily removed; stored preferences are untouched. Crests and the first word of each team name share a nonbreaking inline unit. The former third grid column is reclaimed.

TV displays confirmed scores from public ESPN scoreboards and Euroleague feeds. Explicit live states expire after two minutes without a fresh source check. Supported browser feeds refresh every 90 seconds while visible. A2/GBL still rely on official result snapshots and are not advertised as complete live feeds; GitHub scheduled runs may be delayed. Women volleyball direct refresh is enabled after testing the actual GitHub Pages Origin CORS response.

Bookmaker: DraftKings, via ESPN public scoreboards (provider id 100). ESPN's official announcement: https://espnpressroom.com/press-release/espn-and-draftkings-enter-multi-year-agreement/ . Only source-provided current moneyline prices are used, converted from American to decimal. Football requires all 1X2 prices; basketball requires both winner prices. Exact competition, team aliases, Athens date and kickoff within 15 minutes are required; ambiguous or reversed matches are rejected. Prices expire after ten minutes or at kickoff. Checked time is retrieval time, not an invented last-price-change time. Links use the bookmaker event URL without affiliate tracking or bet-slip outcomes. No account, private API key or betting action is involved. FIBA/CEV Champions League are kept distinct from UEFA football.

Normalized dated snapshots provide fallback data, retaining original per-event timestamps. Browser validation confirmed nine Champions League TV matches with verified prices and no console errors. Validation: 60 tests, Pages build, syntax checks, mobile crest grouping and direct women volleyball refresh.
