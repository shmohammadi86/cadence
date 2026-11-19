import type { AppState } from "./types";

/** Repository interface (YAR pattern): one interface, two implementations —
 *  Tauri (Rust commands → SQLite) and Web (localStorage) for browser dev.
 *  No feature code talks to storage directly. */
export interface Repository {
  kind: "tauri-sqlite" | "web-localstorage";
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  clear(): Promise<void>;
}
