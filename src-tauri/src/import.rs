use serde_json::{json, Value};

/// Import a backup JSON (cadence-export v1 or the shareable web app's
/// day-record v2) into an existing state value.
/// Archive-over-delete (YAR migration ethic): existing days are kept unless
/// the import contains the same date, in which case the import wins for
/// that date. Nothing else is dropped.
pub fn merge_backup(current: Value, backup_text: &str) -> Result<Value, String> {
    let raw: Value = serde_json::from_str(backup_text).map_err(|e| format!("invalid backup: {e}"))?;
    let mut next = if current.is_null() { json!({}) } else { current };

    let days_arr: Vec<Value> = raw
        .get("days")
        .and_then(Value::as_array)
        .cloned()
        .or_else(|| raw.get("records").and_then(Value::as_array).cloned())
        .unwrap_or_default();

    if next.get("days").is_none() {
        next["days"] = json!({});
    }
    if let Some(days_obj) = next.get_mut("days").and_then(Value::as_object_mut) {
        for d in &days_arr {
            if let Some(date) = d.get("localDate").and_then(Value::as_str) {
                days_obj.insert(date.to_string(), d.clone());
            }
        }
    }
    if let Some(settings) = raw.get("settings") {
        next["settings"] = settings.clone();
    }
    if let Some(presets) = raw.get("medPresets").and_then(Value::as_array) {
        if !presets.is_empty() {
            next["medPresets"] = Value::Array(presets.clone());
        }
    }
    if let Some(eps) = raw.get("episodes") {
        next["episodes"] = eps.clone();
    }
    if let Some(a) = raw.get("assessments") {
        next["assessments"] = a.clone();
    }
    if next.get("participantUuid").is_none() {
        if let Some(pid) = raw.get("participantUuid") {
            next["participantUuid"] = pid.clone();
        }
    }
    Ok(next)
}
