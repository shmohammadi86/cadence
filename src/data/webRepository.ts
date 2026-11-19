import type { Repository } from "../domain/repository";
import { defaultState, type AppState } from "../domain/types";

const KEY = "cadence:v1";

export const webRepository: Repository = {
  kind: "web-localstorage",
  async load(): Promise<AppState> {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...defaultState(), ...(JSON.parse(raw) as AppState) };
    } catch { /* storage unavailable — fall through to empty state */ }
    return defaultState();
  },
  async save(state: AppState): Promise<void> {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* surfaced in Reports storage panel */ }
  },
  async clear(): Promise<void> {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  },
};
