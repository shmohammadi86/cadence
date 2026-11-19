# Privacy

- **Local-first.** All records live on the user's own device: browser
  storage for the web build, a local SQLite file for the desktop app.
- **No account, no server, no analytics.** Nothing is transmitted anywhere.
- **Export is the user's act.** JSON/CSV backups are created only when the
  user taps Export, and go wherever the user puts the file.
- **Delete is real.** Reports → Storage & backup → Delete all my data wipes
  every table on the device.
- **Future pooling is separate.** Any future research use requires its own
  explicit, revocable opt-in, de-identified relative-day exports, and a
  privacy review before collection starts. It is never a condition of
  using the app. See ROADMAP.md Phase D.
- **Sensitive data.** Cycle, hormone, mental-health and medication records
  are among the most sensitive data a person generates. The v0.1 desktop
  database is not encrypted at rest; it relies on OS account protections.
  Encryption is a tracked Phase B.1 decision — do not claim otherwise.
