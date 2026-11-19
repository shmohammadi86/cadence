# Browser-first notes

The browser build is the friend's app while desktop signing is set up.

- Storage: localStorage in v0.1 (key `cadence:v1`), behind the Repository
  interface. IndexedDB is the planned browser store upgrade; the migration
  must be archive-over-delete like every other import path.
- Durability limits, stated honestly in Reports: browser storage can be
  cleared by the user or evicted under storage pressure. The mitigation is
  the export backup — encourage a weekly JSON backup.
- The single-file shareable page that preceded this repo used the same
  day-record shape; its backups import here and into the Tauri build.
- iOS Safari is the weakest platform (storage eviction, no background sync).
  Acceptable for a diary; native mobile is Phase C.
