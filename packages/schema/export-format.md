# cadence-export v1

JSON backup produced by the app (browser and Tauri share this format).

- `format: "cadence-export"`, `version: 1`, `exportedAt`, `participantUuid`
- `settings` — cycle settings object
- `days` — array of day records (the participant-day unit; see
  `../schema/schema.sql` `daily_checkins` + child tables for the relational
  form). Medication entries inside a day keep `medName` separate from
  `doseValue` / `doseUnit`.
- `episodes`, `assessments` (item-level responses preserved), `medPresets`

## Import compatibility

- The shareable web app's **day-record v2** backup is accepted by the same
  normaliser: days merge by `localDate`, import wins per date, nothing else
  is dropped (archive-over-delete).
- Research exports are a separate, later transform: calendar dates convert
  to relative `day_in_study`, identifiers are re-pseudonymised, and 0–10
  ratings gain derived 0–5 columns with the scale recorded. That transform
  is Phase D work and never runs by default.
