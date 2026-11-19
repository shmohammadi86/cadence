import type { Repository } from "../domain/repository";
import { isTauri } from "../lib/tauri";
import { tauriRepository } from "./tauriRepository";
import { webRepository } from "./webRepository";

/** Runtime detection (YAR pattern): Tauri → SQLite, browser → localStorage. */
export function pickRepository(): Repository {
  return isTauri() ? tauriRepository : webRepository;
}
