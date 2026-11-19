use serde_json::Value;
use tauri::State;

use crate::import::merge_backup;
use crate::store::Store;

#[tauri::command]
pub fn health_check() -> String {
    "ok".to_string()
}

#[tauri::command]
pub fn load_state(store: State<'_, Store>) -> Result<Value, String> {
    store.load_state()
}

#[tauri::command]
pub fn save_state(store: State<'_, Store>, state: Value) -> Result<(), String> {
    store.save_state(&state)
}

#[tauri::command]
pub fn import_backup(store: State<'_, Store>, json: String) -> Result<Value, String> {
    let current = store.load_state()?;
    let merged = merge_backup(current, &json)?;
    if !merged.is_null() {
        store.save_state(&merged)?;
    }
    Ok(merged)
}

#[tauri::command]
pub fn clear_all(store: State<'_, Store>) -> Result<(), String> {
    store.clear_all()
}
