# Data dictionary (summary)

Canonical detail lives in `packages/schema/` (`schema.sql`,
`rating-scales.json`, `phase-vocabulary.json`) and
`packages/questionnaire/`. This page is the human summary.

| Area | Fields | Scale / notes |
|---|---|---|
| Cycle | phase, phase source, user-corrected flag, flow, cycle day, cycle % | Phase vocabulary maps to research spellings in `phase-vocabulary.json`; flow stored as label + 0–7 ordinal |
| Pain | pain, migraine-day flag | 0–10 faces scale |
| Body & feelings | stress, anxiety, low mood, cramps, fatigue, energy | Native 0–10 sliders; derived 0–5 only in research-shaped exports, scale recorded |
| Symptoms | 13 icon-card symptoms | 0–3 severity (none/mild/moderate/strong) |
| Sleep & wake | bedtime, wake time, duration (derived), quality, naps | Circadian section; `sleep_records` in SQLite |
| Food & water | meal events (type, time, note, skipped), water glasses, meal regularity | Events stored separately so food types/calories can be added later without migration of meaning |
| Medicines | presets (name, usual dose value, usual dose unit, class) and logs (name, dose value, dose unit, time, helped) | Name and dose are **separate fields** everywhere |
| Mood checks | PHQ-2, PHQ-9, GAD-7, PSS-4 | Item-level responses preserved; PSS-4 items 2–3 reverse-scored; non-diagnostic bands |
| Hormones | display curves only in v0.1 | E3G/PdG/LH shapes data-anchored; FSH/testosterone educational schematics; measured values belong in `hormone_observations` |
