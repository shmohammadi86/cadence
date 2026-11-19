# Roadmap

## Now — v0.1 (this release)

- [x] Browser build of the unified check-in (Log vs Reports), local storage,
      JSON/CSV export, backup import
- [x] Tauri v2 desktop shell with local SQLite (`cadence.sqlite3`)
- [x] Import of the web app's backup format (day-record v2) and
      cadence-export v1
- [x] Shared schema + questionnaire packages; med name/dose separated;
      type-to-match medication entry

## Phase B.1 — desktop hardening

- [ ] Code signing + macOS notarization; Windows certificate decision
- [ ] Release workflow producing signed bundles (draft GitHub Releases)
- [ ] Optional extension symptoms behind one expander in Log
- [ ] Advanced measured-hormone entry (LH / E3G / PdG, numeric) for test users
- [ ] Database encryption decision (SQLCipher or keychain-wrapped key) —
      copy must match whatever actually ships

## Phase C — mobile

- [ ] Tauri v2 Android target (sideload first, then Play)
- [ ] iOS via TestFlight
- [ ] Health Connect / HealthKit daily aggregates: sleep detail, resting
      heart rate, HRV, skin-temperature deviation
- [ ] Store privacy declarations and health-data review before any listing

## Phase D — research and models (last, separate consent)

- [ ] Credentialed dataset verification of questionnaire details that are
      still marked as pending (internal research only; no raw research data
      in this repo or in the shipped app, ever)
- [ ] Population priors for phase timing and hormone shapes, labelled as
      population reference in the UI
- [ ] Consented pooling design: separate explicit opt-in, relative-day
      de-identified exports, privacy review before any collection
- [ ] Personal pattern models trained only on consented Cadence data,
      evaluated on held-out people against calendar-only baselines;
      predictions stored and shown next to outcomes
- [ ] No diagnosis, prediction-accuracy, fertility, or medication-efficacy
      claims at any point
