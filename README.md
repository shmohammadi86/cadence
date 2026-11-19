# Cadence — Migraine & Cycle Companion

A calm, cute, local-first companion for daily tracking of menstrual cycle,
migraine and headache, stress / anxiety / low mood, cramps, fatigue, sleep
and circadian rhythm, food and water, and medicines with doses.

Built for one friend first, then a small circle, then more broadly.
No account. No server. Nothing leaves the device unless you export it.

## Two ways to run it

**Browser (works today, `pnpm dev`)**

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

In a plain browser, data is saved in the browser's local storage on that
device, with JSON/CSV export and import in Reports → Storage & backup.

**Desktop app (Tauri v2)**

```bash
pnpm install
pnpm tauri dev    # needs the Rust toolchain: https://rustup.rs
pnpm tauri build  # bundles for your OS (unsigned beta until signing lands)
```

In the Tauri app, the same interface saves into a local SQLite database,
`cadence.sqlite3`, in the app data folder for `org.cytognosis.cadence`.

## Moving from the web version to the app

In the web version: Reports → Storage & backup → **Export backup (JSON)**.
In the app: Reports → Storage & backup → **Import backup**. Days come across
date for date — no re-entry. This import is the acceptance test for every
release.

## Layout

- `src/` — one React + TypeScript frontend for web and Tauri
  (`app/`, `features/`, `domain/`, `data/`, `lib/`, `styles/`)
- `src-tauri/` — Tauri v2 shell: Rust commands over bundled SQLite
- `packages/schema/` — the shared database schema (single source of truth)
- `packages/questionnaire/` — questionnaire definitions as data
- `docs/` — architecture, privacy, data dictionary, build runbooks
- `scripts/` — desktop build entry point, commit-author verification

See `ARCHITECTURE.md` for how the pieces fit and `ROADMAP.md` for what is
next (mobile, then a separate research phase). This app makes no medical
claims: scores and patterns are information for you and, if you choose, a
summary for your clinician — not a diagnosis.
