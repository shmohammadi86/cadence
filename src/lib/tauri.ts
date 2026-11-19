// Typed bridge to Rust commands — mirrors YAR's src/lib/tauri.ts.
// This is the ONLY file that imports @tauri-apps/api.
import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "../domain/types";

export const isTauri = (): boolean =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const cadenceBridge = {
  healthCheck: () => invoke<string>("health_check"),
  loadState: () => invoke<AppState>("load_state"),
  saveState: (state: AppState) => invoke<void>("save_state", { state }),
  importBackup: (json: string) => invoke<AppState>("import_backup", { json }),
  clearAll: () => invoke<void>("clear_all"),
};
