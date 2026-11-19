import type { Repository } from "../domain/repository";
import { defaultState, type AppState } from "../domain/types";
import { cadenceBridge } from "../lib/tauri";

export const tauriRepository: Repository = {
  kind: "tauri-sqlite",
  async load(): Promise<AppState> {
    try {
      const s = await cadenceBridge.loadState();
      return { ...defaultState(), ...s };
    } catch {
      return defaultState();
    }
  },
  async save(state: AppState): Promise<void> {
    await cadenceBridge.saveState(state);
  },
  async clear(): Promise<void> {
    await cadenceBridge.clearAll();
  },
};
