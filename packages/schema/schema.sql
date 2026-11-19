-- Cadence canonical DDL — @cadence/schema
-- Source of truth for: browser export shape, Tauri SQLite (src-tauri migrations
-- mirror this file), and the future research export view.
-- One participant-day is the core unit. Ratings carry their scale in
-- rating-scales.json, never silently merged across scales.
-- No health data lives in git: this file is schema only.

CREATE TABLE IF NOT EXISTS profile (
  participant_uuid   TEXT PRIMARY KEY,
  birth_year         INTEGER,
  age_at_menarche    INTEGER,
  typical_cycle_len  INTEGER,
  typical_period_len INTEGER,
  uses_hormonal_contraception INTEGER,
  created_at         TEXT NOT NULL,
  schema_version     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cycles (
  cycle_id         TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL REFERENCES profile(participant_uuid),
  cycle_index      INTEGER NOT NULL,
  start_date       TEXT NOT NULL,
  end_date         TEXT,
  length_days      INTEGER,
  is_complete      INTEGER DEFAULT 0,
  UNIQUE(participant_uuid, cycle_index)
);

CREATE TABLE IF NOT EXISTS daily_checkins (
  participant_uuid TEXT NOT NULL REFERENCES profile(participant_uuid),
  local_date       TEXT NOT NULL,
  cycle_id         TEXT REFERENCES cycles(cycle_id),
  cycle_day        INTEGER,
  cycle_pct        REAL,
  phase_label      TEXT,
  phase_source     TEXT,
  phase_user_corrected INTEGER DEFAULT 0,
  flow             TEXT,
  flow_ordinal     INTEGER,
  migraine_pain_0_10 INTEGER,
  migraine_day     INTEGER DEFAULT 0,
  stress_0_10      INTEGER,
  anxiety_0_10     INTEGER,
  low_mood_0_10    INTEGER,
  cramps_0_10      INTEGER,
  fatigue_0_10     INTEGER,
  energy_0_10      INTEGER,
  symptoms_json    TEXT DEFAULT '{}',
  water_glasses    INTEGER DEFAULT 0,
  meal_regularity_1_5 INTEGER,
  notes            TEXT DEFAULT '',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (participant_uuid, local_date)
);

CREATE TABLE IF NOT EXISTS hormone_observations (
  obs_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  analyte TEXT NOT NULL,  -- LH | E3G | PdG (measured only)
  value REAL NOT NULL, unit TEXT NOT NULL,
  source TEXT NOT NULL,   -- mira_manual | lab
  measured_at TEXT,
  UNIQUE(participant_uuid, local_date, analyte, source)
);

CREATE TABLE IF NOT EXISTS hormone_estimates (
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  analyte TEXT NOT NULL,  -- estrogen_est | progesterone_est | LH_est | FSH_schematic | testosterone_schematic
  value_norm REAL,
  basis TEXT NOT NULL,    -- population_curve | textbook_schematic | personal_model_v1
  PRIMARY KEY (participant_uuid, local_date, analyte, basis)
);

CREATE TABLE IF NOT EXISTS migraine_episodes (
  episode_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  started_at TEXT, ended_at TEXT, duration_min INTEGER,
  pain_peak_0_10 INTEGER, pain_avg_0_10 INTEGER,
  location TEXT, pain_type TEXT, aura INTEGER,
  symptoms_json TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS mood_assessments (
  assessment_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  instrument TEXT NOT NULL,  -- PHQ2 | PHQ9 | GAD7 | PSS4 | QUICK_DAILY
  item_responses TEXT NOT NULL,  -- JSON array, item-level preserved
  total_score INTEGER, max_score INTEGER, interpretation_band TEXT
);

CREATE TABLE IF NOT EXISTS medication_presets (
  preset_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL,
  name TEXT NOT NULL,  -- medication name, always separate from dose
  default_dose_value REAL, default_dose_unit TEXT,
  med_class TEXT, is_active INTEGER DEFAULT 1, sort_order INTEGER
);

CREATE TABLE IF NOT EXISTS medication_logs (
  log_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  preset_id TEXT REFERENCES medication_presets(preset_id),
  med_name TEXT NOT NULL,  -- name snapshot, separate from dose fields
  dose_value REAL, dose_unit TEXT,
  taken_at TEXT, helped_rating TEXT,
  episode_id TEXT REFERENCES migraine_episodes(episode_id)
);

CREATE TABLE IF NOT EXISTS sleep_records (
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  bedtime TEXT, wake_time TEXT, duration_min INTEGER,
  quality_0_10 INTEGER, naps_json TEXT DEFAULT '[]',
  total_min INTEGER, deep_min INTEGER, light_min INTEGER, rem_min INTEGER,
  efficiency REAL, sleep_score INTEGER,
  source TEXT NOT NULL DEFAULT 'manual',
  PRIMARY KEY (participant_uuid, local_date, source)
);

CREATE TABLE IF NOT EXISTS food_events (
  event_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  meal_type TEXT NOT NULL,  -- breakfast | lunch | dinner | snack (extendable to food types/calories later)
  time TEXT, note TEXT DEFAULT '', skipped INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS wearable_daily (
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  resting_hr REAL, hrv_rmssd_ms REAL, skin_temp_dev_c REAL,
  respiratory_rate REAL, spo2_pct REAL,
  steps INTEGER, active_min_light INTEGER, active_min_moderate INTEGER, active_min_vigorous INTEGER,
  wear_minutes INTEGER, source TEXT NOT NULL,
  PRIMARY KEY (participant_uuid, local_date, source)
);

CREATE TABLE IF NOT EXISTS triggers_daily (
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  trigger_key TEXT NOT NULL, value TEXT,
  PRIMARY KEY (participant_uuid, local_date, trigger_key)
);

CREATE TABLE IF NOT EXISTS model_predictions (
  prediction_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL, local_date TEXT NOT NULL,
  target TEXT NOT NULL, probability REAL, predicted_label TEXT,
  model_name TEXT NOT NULL, model_version TEXT NOT NULL,
  features_snapshot TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_and_exports (
  export_id TEXT PRIMARY KEY,
  participant_uuid TEXT NOT NULL,
  scope TEXT NOT NULL, consented_at TEXT, revoked_at TEXT,
  export_format TEXT, relative_day_origin TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  participant_uuid TEXT PRIMARY KEY,
  settings_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_days_pct ON daily_checkins(participant_uuid, cycle_pct);
CREATE INDEX IF NOT EXISTS idx_episodes_day ON migraine_episodes(participant_uuid, local_date);
CREATE INDEX IF NOT EXISTS idx_medlogs_day ON medication_logs(participant_uuid, local_date);
