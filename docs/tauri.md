# Tauri build runbook

## Prerequisites

- Node 22 + pnpm 9 (`packageManager` is pinned in `package.json`)
- Rust stable via rustup (≥ 1.77.2)
- Linux: Tauri's system libraries (webkit2gtk-4.1, libappindicator, librsvg)
  per the Tauri v2 prerequisites for your distro

## Commands

```bash
pnpm install
pnpm tauri dev     # dev build against http://localhost:5173
pnpm tauri build   # production bundle for the current OS
pnpm desktop:doctor  # checks node, pnpm, cargo
```

## Data location

SQLite file: `cadence.sqlite3` in the app data directory for
`org.cytognosis.cadence` (Tauri `app_data_dir`). Backup = export from the
app, or copy that one file while the app is closed.

## Signing status (honest)

Not set up yet. Desktop bundles are **unsigned beta**: macOS Gatekeeper and
Windows SmartScreen will warn. Before any wider release: Apple Developer ID
+ notarization, a Windows code-signing certificate, and an Android release
keystore kept out of git. YAR has no signing pipeline to copy; this is new
work, tracked in ROADMAP.md Phase B.1.
