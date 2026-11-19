# Cadence architecture

## One frontend, two homes

```
                 ┌──────────────────────────────┐
                 │  src/  React + TS + Vite     │
                 │  Log (entry) · Reports (view)│
                 └──────────────┬───────────────┘
                                │ Repository interface
                 ┌──────────────┴───────────────┐
        browser  │                              │  Tauri
   webRepository │                              │  tauriRepository
   (localStorage)│                              │  src/lib/tauri.ts bridge
                 │                              │        ↓ invoke()
                 │                              │  src-tauri commands.rs
                 │                              │        ↓
                 │                              │  store.rs → rusqlite (bundled)
                 │                              │  cadence.sqlite3 (app data dir)
                 └──────────────────────────────┘
```

The repository-boundary pattern comes from YAR (cytognosis/Yar): no feature
code imports Tauri or localStorage directly, so the browser build and the
desktop build can never diverge in behaviour. All domain logic (cycle phase,
scoring, export shaping) lives in `src/domain/` and is shared.

## Data

- The participant-day is the core unit: one joined record per day holding
  cycle, pain, body signals, sleep, food, medicines and mood.
- Canonical schema: `packages/schema/schema.sql`. The Rust migrations in
  `src-tauri/src/migrations.rs` mirror it; the TypeScript types in
  `src/domain/types.ts` mirror both.
- Medication name and dose are separate fields everywhere
  (`medName` vs `doseValue`/`doseUnit`; `med_name` vs `dose_value`/`dose_unit`).
- Ratings keep their scale: native 0–10 in the UI; derived 0–5 values are
  produced only in research-shaped exports, with the scale recorded.
- Hormone curves shown in the app are typical population shapes.
  Estrogen (E3G) and progesterone (PdG) shapes are data-anchored; FSH and
  testosterone are labelled educational schematics. Measured hormone values,
  if ever entered, live in `hormone_observations`, never mixed with estimates.

## Phases

- **Phase A — browser first:** the friend logs now (this repo's web build,
  plus the single-file shareable page that preceded it).
- **Phase B — Tauri desktop:** this build. SQLite storage, import from the
  browser backup as the acceptance test. Unsigned beta until code signing
  and notarization are set up (YAR has no signing to copy — it is new work).
- **Phase C — mobile:** Tauri v2 mobile targets; Health Connect / HealthKit
  daily aggregates into `wearable_daily` and `sleep_records`.
- **Phase D — research / models:** a separate, consented phase. Population
  data may inform phase and hormone priors; a migraine model can only be
  trained on consented Cadence data with migraine labels, with predictions
  stored in `model_predictions` and shown next to outcomes. No clinical
  claims at any phase. See `docs/privacy.md` and `ROADMAP.md`.
