# Cadence — house rules

1. **Commit author, every commit, no exceptions:**
   `Shahin Mohammadi <mohammadi@cytognosis.org>`
   Set repo-locally (`git config user.name "Shahin Mohammadi"`,
   `git config user.email "mohammadi@cytognosis.org"`) and verify with
   `git log --format='%an <%ae>'` before pushing. `scripts/verify-authors.mjs`
   checks a range; CI runs it too.
2. **Conventional commits**, scoped: `type(cadence): summary`,
   `type(tauri): summary`, `type(schema): summary`.
3. **No health data in git, ever.** No `*.db`, `*.sqlite*`, exports, backups,
   or row-level research data. Schema and migrations only.
4. **No clinical claims** in app copy, README, or release notes: no diagnosis,
   no prediction accuracy, no fertility/contraception guidance, no
   medication-efficacy conclusions. Hormone curves are population shapes;
   FSH/testosterone are educational schematics and are labelled as such.
5. **One frontend:** all storage goes through the Repository interface
   (`src/domain/repository.ts`). No feature code imports Tauri or
   localStorage directly; `src/lib/tauri.ts` is the only file that imports
   `@tauri-apps/api`.
6. Medication **name and dose are separate fields** in UI, storage, and
   exports. Never rejoin them into one free-text string.
