import { create } from "zustand";
import { pickRepository } from "../data/detect";
import type { Repository } from "../domain/repository";
import { defaultState, emptyDay, type AppState, type DayRecord } from "../domain/types";

interface Store {
  repo: Repository;
  state: AppState;
  loaded: boolean;
  storageError: string | null;
  init: () => Promise<void>;
  setState: (s: AppState) => Promise<void>;
  updateDay: (date: string, patch: Partial<DayRecord>) => Promise<void>;
  replace: (s: AppState) => Promise<void>;
}

const repo = pickRepository();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<Store>((set, get) => ({
  repo,
  state: defaultState(),
  loaded: false,
  storageError: null,
  async init() {
    const state = await repo.load();
    set({ state, loaded: true });
  },
  async setState(s) {
    set({ state: s });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try { await repo.save(get().state); set({ storageError: null }); }
      catch (e) { set({ storageError: String(e) }); }
    }, 250);
  },
  async updateDay(date, patch) {
    const cur = get().state;
    const day = { ...(cur.days[date] ?? emptyDay(date)), ...patch, updatedAt: new Date().toISOString() };
    await get().setState({ ...cur, days: { ...cur.days, [date]: day } });
  },
  async replace(s) {
    await repo.save(s);
    set({ state: s });
  },
}));
