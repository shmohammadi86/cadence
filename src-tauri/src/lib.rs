mod commands;
mod import;
mod migrations;
mod store;

use store::Store;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            let store = Store::open(dir).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?;
            app.manage(store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::health_check,
            commands::load_state,
            commands::save_state,
            commands::import_backup,
            commands::clear_all,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Cadence");
}
