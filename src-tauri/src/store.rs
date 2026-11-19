use rusqlite::{params, Connection};
use serde_json::{json, Map, Value};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::migrations;

pub struct Store {
    pub conn: Mutex<Connection>,
}

impl Store {
    pub fn open(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let path = app_data_dir.join("cadence.sqlite3");
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.pragma_update(None, "journal_mode", "WAL").map_err(|e| e.to_string())?;
        conn.pragma_update(None, "foreign_keys", "ON").map_err(|e| e.to_string())?;
        migrations::run(&conn).map_err(|e| e.to_string())?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    /// Whole-state save in one transaction. Cadence is a single-user,
    /// on-device diary: replacing the projection atomically is simpler and
    /// safer than diffing, and the relational tables below stay the source
    /// of truth on disk.
    pub fn save_state(&self, state: &Value) -> Result<(), String> {
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        let pid = state.get("participantUuid").and_then(Value::as_str).unwrap_or("local");
        let now = chrono_now();
        tx.execute(
            "INSERT INTO profile (participant_uuid, created_at, schema_version) VALUES (?1, ?2, 1)
             ON CONFLICT(participant_uuid) DO NOTHING",
            params![pid, now],
        ).map_err(|e| e.to_string())?;
        tx.execute(
            "INSERT INTO app_settings (participant_uuid, settings_json) VALUES (?1, ?2)
             ON CONFLICT(participant_uuid) DO UPDATE SET settings_json = excluded.settings_json",
            params![pid, state.get("settings").map(|s| s.to_string()).unwrap_or_else(|| "{}".into())],
        ).map_err(|e| e.to_string())?;

        for table in ["daily_checkins", "medication_logs", "sleep_records", "food_events",
                      "migraine_episodes", "mood_assessments", "medication_presets"] {
            tx.execute(&format!("DELETE FROM {table} WHERE participant_uuid = ?1"), params![pid])
                .map_err(|e| e.to_string())?;
        }

        if let Some(days) = state.get("days").and_then(Value::as_object) {
            for (date, d) in days {
                save_day(&tx, pid, date, d)?;
            }
        }
        if let Some(presets) = state.get("medPresets").and_then(Value::as_array) {
            for p in presets {
                tx.execute(
                    "INSERT INTO medication_presets (preset_id, participant_uuid, name, default_dose_value, default_dose_unit, med_class, is_active, sort_order)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![
                        p.get("id").and_then(Value::as_str).unwrap_or(""),
                        pid,
                        p.get("name").and_then(Value::as_str).unwrap_or(""),
                        of(p.get("defaultDoseValue")),
                        p.get("defaultDoseUnit").and_then(Value::as_str),
                        p.get("medClass").and_then(Value::as_str),
                        p.get("isActive").and_then(Value::as_bool).unwrap_or(true) as i64,
                        p.get("sortOrder").and_then(Value::as_i64).unwrap_or(0),
                    ],
                ).map_err(|e| e.to_string())?;
            }
        }
        if let Some(eps) = state.get("episodes").and_then(Value::as_array) {
            for e in eps {
                tx.execute(
                    "INSERT INTO migraine_episodes (episode_id, participant_uuid, local_date, started_at, duration_min, pain_peak_0_10, location, pain_type, aura, symptoms_json)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![
                        e.get("id").and_then(Value::as_str).unwrap_or(""),
                        pid,
                        e.get("localDate").and_then(Value::as_str).unwrap_or(""),
                        e.get("startedAt").and_then(Value::as_str),
                        oi(e.get("durationMin")),
                        oi(e.get("painPeak0_10")),
                        e.get("location").and_then(Value::as_str),
                        e.get("painType").and_then(Value::as_str),
                        e.get("aura").and_then(Value::as_bool).unwrap_or(false) as i64,
                        e.get("symptoms").map(|s| s.to_string()).unwrap_or_else(|| "{}".into()),
                    ],
                ).map_err(|e| e.to_string())?;
            }
        }
        if let Some(list) = state.get("assessments").and_then(Value::as_array) {
            for a in list {
                tx.execute(
                    "INSERT INTO mood_assessments (assessment_id, participant_uuid, local_date, instrument, item_responses, total_score, max_score, interpretation_band)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                    params![
                        a.get("id").and_then(Value::as_str).unwrap_or(""),
                        pid,
                        a.get("localDate").and_then(Value::as_str).unwrap_or(""),
                        a.get("instrument").and_then(Value::as_str).unwrap_or(""),
                        a.get("itemResponses").map(|s| s.to_string()).unwrap_or_else(|| "[]".into()),
                        oi(a.get("totalScore")),
                        oi(a.get("maxScore")),
                        a.get("interpretationBand").and_then(Value::as_str),
                    ],
                ).map_err(|e| e.to_string())?;
            }
        }
        tx.commit().map_err(|e| e.to_string())
    }

    pub fn load_state(&self) -> Result<Value, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let pid: Option<String> = conn.query_row(
            "SELECT participant_uuid FROM profile ORDER BY created_at LIMIT 1", [], |r| r.get(0),
        ).ok();
        let Some(pid) = pid else {
            return Ok(Value::Null);
        };
        let settings_json: String = conn.query_row(
            "SELECT settings_json FROM app_settings WHERE participant_uuid = ?1", params![pid], |r| r.get(0),
        ).unwrap_or_else(|_| "{}".into());
        let settings: Value = serde_json::from_str(&settings_json).unwrap_or_else(|_| json!({}));

        let mut days = Map::new();
        {
            let mut stmt = conn.prepare(
                "SELECT local_date, cycle_day, cycle_pct, phase_label, phase_source, phase_user_corrected,
                        flow, flow_ordinal, migraine_pain_0_10, migraine_day, stress_0_10, anxiety_0_10,
                        low_mood_0_10, cramps_0_10, fatigue_0_10, energy_0_10, symptoms_json,
                        water_glasses, meal_regularity_1_5, notes, created_at, updated_at
                 FROM daily_checkins WHERE participant_uuid = ?1",
            ).map_err(|e| e.to_string())?;
            let rows = stmt.query_map(params![pid], |r| {
                Ok((
                    r.get::<_, String>(0)?, r.get::<_, Option<i64>>(1)?, r.get::<_, Option<f64>>(2)?,
                    r.get::<_, Option<String>>(3)?, r.get::<_, Option<String>>(4)?, r.get::<_, i64>(5)?,
                    r.get::<_, Option<String>>(6)?, r.get::<_, Option<i64>>(7)?, r.get::<_, Option<i64>>(8)?,
                    r.get::<_, i64>(9)?, r.get::<_, Option<i64>>(10)?, r.get::<_, Option<i64>>(11)?,
                    r.get::<_, Option<i64>>(12)?, r.get::<_, Option<i64>>(13)?, r.get::<_, Option<i64>>(14)?,
                    r.get::<_, Option<i64>>(15)?, r.get::<_, String>(16)?, r.get::<_, i64>(17)?,
                    r.get::<_, Option<i64>>(18)?, r.get::<_, String>(19)?,
                    r.get::<_, String>(20)?, r.get::<_, String>(21)?,
                ))
            }).map_err(|e| e.to_string())?;
            for row in rows {
                let (date, cycle_day, cycle_pct, phase, phase_src, corrected, flow, flow_ord,
                     pain, mig, stress, anxiety, low_mood, cramps, fatigue, energy, symptoms,
                     water, regularity, notes, created, updated) = row.map_err(|e| e.to_string())?;
                let mut day = json!({
                    "localDate": date, "cycleDay": cycle_day, "cyclePct": cycle_pct,
                    "phaseLabel": phase, "phaseSource": phase_src, "phaseUserCorrected": corrected != 0,
                    "flow": flow.unwrap_or_else(|| "none".into()), "flowOrdinal0_7": flow_ord.unwrap_or(0),
                    "pain0_10": pain, "migraineDay": mig != 0,
                    "stress0_10": stress, "anxiety0_10": anxiety, "lowMood0_10": low_mood,
                    "cramps0_10": cramps, "fatigue0_10": fatigue, "energy0_10": energy,
                    "symptoms": serde_json::from_str::<Value>(&symptoms).unwrap_or_else(|_| json!({})),
                    "sleep": { "bedtime": "23:00", "wakeTime": "07:00", "quality0_10": null, "naps": [] },
                    "meals": [], "waterGlasses": water, "mealRegularity1_5": regularity,
                    "medLogs": [], "notes": notes, "createdAt": created, "updatedAt": updated,
                });
                load_day_children(&conn, &pid, &date, &mut day)?;
                days.insert(date, day);
            }
        }

        let presets = load_presets(&conn, &pid)?;
        let episodes = load_episodes(&conn, &pid)?;
        let assessments = load_assessments(&conn, &pid)?;
        Ok(json!({
            "participantUuid": pid, "settings": settings, "days": days,
            "episodes": episodes, "assessments": assessments, "medPresets": presets,
        }))
    }

    pub fn clear_all(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        for table in ["daily_checkins", "medication_logs", "sleep_records", "food_events",
                      "migraine_episodes", "mood_assessments", "medication_presets",
                      "hormone_observations", "hormone_estimates", "wearable_daily",
                      "triggers_daily", "model_predictions", "consent_and_exports",
                      "cycles", "app_settings", "profile"] {
            conn.execute(&format!("DELETE FROM {table}"), []).map_err(|e| e.to_string())?;
        }
        Ok(())
    }
}

fn save_day(tx: &rusqlite::Transaction, pid: &str, date: &str, d: &Value) -> Result<(), String> {
    tx.execute(
        "INSERT INTO daily_checkins (participant_uuid, local_date, cycle_day, cycle_pct, phase_label, phase_source,
            phase_user_corrected, flow, flow_ordinal, migraine_pain_0_10, migraine_day, stress_0_10, anxiety_0_10,
            low_mood_0_10, cramps_0_10, fatigue_0_10, energy_0_10, symptoms_json, water_glasses,
            meal_regularity_1_5, notes, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
        params![
            pid, date,
            oi(d.get("cycleDay")), of(d.get("cyclePct")),
            d.get("phaseLabel").and_then(Value::as_str), d.get("phaseSource").and_then(Value::as_str),
            d.get("phaseUserCorrected").and_then(Value::as_bool).unwrap_or(false) as i64,
            d.get("flow").and_then(Value::as_str).unwrap_or("none"), oi(d.get("flowOrdinal0_7")),
            oi(d.get("pain0_10")), d.get("migraineDay").and_then(Value::as_bool).unwrap_or(false) as i64,
            oi(d.get("stress0_10")), oi(d.get("anxiety0_10")), oi(d.get("lowMood0_10")),
            oi(d.get("cramps0_10")), oi(d.get("fatigue0_10")), oi(d.get("energy0_10")),
            d.get("symptoms").map(|s| s.to_string()).unwrap_or_else(|| "{}".into()),
            d.get("waterGlasses").and_then(Value::as_i64).unwrap_or(0),
            oi(d.get("mealRegularity1_5")),
            d.get("notes").and_then(Value::as_str).unwrap_or(""),
            d.get("createdAt").and_then(Value::as_str).unwrap_or(""),
            d.get("updatedAt").and_then(Value::as_str).unwrap_or(""),
        ],
    ).map_err(|e| e.to_string())?;

    if let Some(s) = d.get("sleep") {
        let bed = s.get("bedtime").and_then(Value::as_str).unwrap_or("23:00");
        let wake = s.get("wakeTime").and_then(Value::as_str).unwrap_or("07:00");
        tx.execute(
            "INSERT INTO sleep_records (participant_uuid, local_date, bedtime, wake_time, quality_0_10, naps_json, source)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'manual')",
            params![pid, date, bed, wake, oi(s.get("quality0_10")),
                    s.get("naps").map(|n| n.to_string()).unwrap_or_else(|| "[]".into())],
        ).map_err(|e| e.to_string())?;
    }
    if let Some(meals) = d.get("meals").and_then(Value::as_array) {
        for m in meals {
            tx.execute(
                "INSERT INTO food_events (event_id, participant_uuid, local_date, meal_type, time, note, skipped)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    m.get("id").and_then(Value::as_str).unwrap_or(""), pid, date,
                    m.get("mealType").and_then(Value::as_str).unwrap_or("snack"),
                    m.get("time").and_then(Value::as_str),
                    m.get("note").and_then(Value::as_str).unwrap_or(""),
                    m.get("skipped").and_then(Value::as_bool).unwrap_or(false) as i64,
                ],
            ).map_err(|e| e.to_string())?;
        }
    }
    if let Some(logs) = d.get("medLogs").and_then(Value::as_array) {
        for l in logs {
            tx.execute(
                "INSERT INTO medication_logs (log_id, participant_uuid, local_date, med_name, dose_value, dose_unit, taken_at, helped_rating)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
                params![
                    l.get("id").and_then(Value::as_str).unwrap_or(""), pid, date,
                    l.get("medName").and_then(Value::as_str).unwrap_or(""),
                    of(l.get("doseValue")), l.get("doseUnit").and_then(Value::as_str),
                    l.get("takenAt").and_then(Value::as_str),
                    l.get("helped").and_then(Value::as_str),
                ],
            ).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn load_day_children(conn: &Connection, pid: &str, date: &str, day: &mut Value) -> Result<(), String> {
    if let Ok((bed, wake, quality, naps)) = conn.query_row(
        "SELECT bedtime, wake_time, quality_0_10, naps_json FROM sleep_records
         WHERE participant_uuid = ?1 AND local_date = ?2 AND source = 'manual'",
        params![pid, date],
        |r| Ok((r.get::<_, Option<String>>(0)?, r.get::<_, Option<String>>(1)?,
                r.get::<_, Option<i64>>(2)?, r.get::<_, String>(3)?)),
    ) {
        day["sleep"] = json!({
            "bedtime": bed.unwrap_or_else(|| "23:00".into()),
            "wakeTime": wake.unwrap_or_else(|| "07:00".into()),
            "quality0_10": quality,
            "naps": serde_json::from_str::<Value>(&naps).unwrap_or_else(|_| json!([])),
        });
    }
    let mut meals = Vec::new();
    {
        let mut stmt = conn.prepare(
            "SELECT event_id, meal_type, time, note, skipped FROM food_events WHERE participant_uuid = ?1 AND local_date = ?2",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![pid, date], |r| {
            Ok(json!({
                "id": r.get::<_, String>(0)?, "mealType": r.get::<_, String>(1)?,
                "time": r.get::<_, Option<String>>(2)?.unwrap_or_default(),
                "note": r.get::<_, String>(3)?, "skipped": r.get::<_, i64>(4)? != 0,
            }))
        }).map_err(|e| e.to_string())?;
        for row in rows { meals.push(row.map_err(|e| e.to_string())?); }
    }
    day["meals"] = Value::Array(meals);

    let mut logs = Vec::new();
    {
        let mut stmt = conn.prepare(
            "SELECT log_id, med_name, dose_value, dose_unit, taken_at, helped_rating FROM medication_logs WHERE participant_uuid = ?1 AND local_date = ?2",
        ).map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![pid, date], |r| {
            Ok(json!({
                "id": r.get::<_, String>(0)?, "medName": r.get::<_, String>(1)?,
                "doseValue": r.get::<_, Option<f64>>(2)?, "doseUnit": r.get::<_, Option<String>>(3)?.unwrap_or_else(|| "mg".into()),
                "takenAt": r.get::<_, Option<String>>(4)?.unwrap_or_default(),
                "helped": r.get::<_, Option<String>>(5)?,
            }))
        }).map_err(|e| e.to_string())?;
        for row in rows { logs.push(row.map_err(|e| e.to_string())?); }
    }
    day["medLogs"] = Value::Array(logs);
    Ok(())
}

fn load_presets(conn: &Connection, pid: &str) -> Result<Value, String> {
    let mut out = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT preset_id, name, default_dose_value, default_dose_unit, med_class, is_active, sort_order FROM medication_presets WHERE participant_uuid = ?1 ORDER BY sort_order",
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![pid], |r| {
        Ok(json!({
            "id": r.get::<_, String>(0)?, "name": r.get::<_, String>(1)?,
            "defaultDoseValue": r.get::<_, Option<f64>>(2)?,
            "defaultDoseUnit": r.get::<_, Option<String>>(3)?.unwrap_or_else(|| "mg".into()),
            "medClass": r.get::<_, Option<String>>(4)?.unwrap_or_else(|| "other".into()),
            "isActive": r.get::<_, i64>(5)? != 0, "sortOrder": r.get::<_, i64>(6)?,
        }))
    }).map_err(|e| e.to_string())?;
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(Value::Array(out))
}

fn load_episodes(conn: &Connection, pid: &str) -> Result<Value, String> {
    let mut out = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT episode_id, local_date, started_at, duration_min, pain_peak_0_10, location, pain_type, aura, symptoms_json FROM migraine_episodes WHERE participant_uuid = ?1",
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![pid], |r| {
        Ok(json!({
            "id": r.get::<_, String>(0)?, "localDate": r.get::<_, String>(1)?,
            "startedAt": r.get::<_, Option<String>>(2)?.unwrap_or_default(),
            "durationMin": r.get::<_, Option<i64>>(3)?, "painPeak0_10": r.get::<_, Option<i64>>(4)?,
            "location": r.get::<_, Option<String>>(5)?.unwrap_or_default(),
            "painType": r.get::<_, Option<String>>(6)?.unwrap_or_default(),
            "aura": r.get::<_, i64>(7)? != 0,
            "symptoms": serde_json::from_str::<Value>(&r.get::<_, String>(8)?).unwrap_or_else(|_| json!({})),
        }))
    }).map_err(|e| e.to_string())?;
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(Value::Array(out))
}

fn load_assessments(conn: &Connection, pid: &str) -> Result<Value, String> {
    let mut out = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT assessment_id, local_date, instrument, item_responses, total_score, max_score, interpretation_band FROM mood_assessments WHERE participant_uuid = ?1",
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![pid], |r| {
        Ok(json!({
            "id": r.get::<_, String>(0)?, "localDate": r.get::<_, String>(1)?,
            "instrument": r.get::<_, String>(2)?,
            "itemResponses": serde_json::from_str::<Value>(&r.get::<_, String>(3)?).unwrap_or_else(|_| json!([])),
            "totalScore": r.get::<_, Option<i64>>(4)?, "maxScore": r.get::<_, Option<i64>>(5)?,
            "interpretationBand": r.get::<_, Option<String>>(6)?.unwrap_or_default(),
        }))
    }).map_err(|e| e.to_string())?;
    for row in rows { out.push(row.map_err(|e| e.to_string())?); }
    Ok(Value::Array(out))
}

fn oi(v: Option<&Value>) -> Option<i64> {
    v.and_then(|x| x.as_i64().or_else(|| x.as_f64().map(|f| f as i64)))
}
fn of(v: Option<&Value>) -> Option<f64> {
    v.and_then(Value::as_f64)
}

/// Seconds since epoch as an ISO-ish string — avoids a chrono dependency for
/// the one timestamp the Rust layer creates itself.
fn chrono_now() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!("unix:{secs}")
}
