import { defaultState, type AppState, type DayRecord } from "./types";

// Export format: "cadence-export v1" — a superset of the shareable web app's
// day-record v2 backup. The v2 backup imports here; this export imports into
// the SQLite database through the same normaliser (import.rs mirrors it).

export interface CadenceExport {
  format: "cadence-export";
  version: 1;
  exportedAt: string;
  participantUuid: string;
  settings: AppState["settings"];
  days: DayRecord[];
  episodes: AppState["episodes"];
  assessments: AppState["assessments"];
  medPresets: AppState["medPresets"];
}

export function toExport(state: AppState): CadenceExport {
  return {
    format: "cadence-export", version: 1, exportedAt: new Date().toISOString(),
    participantUuid: state.participantUuid, settings: state.settings,
    days: Object.values(state.days).sort((a, b) => a.localDate.localeCompare(b.localDate)),
    episodes: state.episodes, assessments: state.assessments, medPresets: state.medPresets,
  };
}

export function download(filename: string, text: string, mime = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function exportJSON(state: AppState): string {
  return JSON.stringify(toExport(state), null, 2);
}

export function exportCSV(state: AppState): string {
  const cols = ["local_date","cycle_day","cycle_pct","phase","flow","pain_0_10","migraine_day",
    "stress_0_10","anxiety_0_10","low_mood_0_10","cramps_0_10","fatigue_0_10","energy_0_10",
    "sleep_bedtime","sleep_wake","sleep_quality_0_10","water_glasses","meal_regularity_1_5",
    "meds","notes",
    // derived 0-5 values for research harmonisation, scale recorded in header names
    "cramps_0_5_derived","fatigue_0_5_derived","stress_0_5_derived"];
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const rows = Object.values(state.days).sort((a, b) => a.localDate.localeCompare(b.localDate)).map((d) => [
    d.localDate, d.cycleDay ?? "", d.cyclePct?.toFixed(1) ?? "", d.phaseLabel ?? "", d.flow,
    d.pain0_10 ?? "", d.migraineDay ? 1 : 0, d.stress0_10 ?? "", d.anxiety0_10 ?? "",
    d.lowMood0_10 ?? "", d.cramps0_10 ?? "", d.fatigue0_10 ?? "", d.energy0_10 ?? "",
    d.sleep.bedtime, d.sleep.wakeTime, d.sleep.quality0_10 ?? "", d.waterGlasses,
    d.mealRegularity1_5 ?? "",
    d.medLogs.map((m) => `${m.medName} ${m.doseValue ?? ""}${m.doseUnit}`.trim()).join("; "),
    d.notes,
    d.cramps0_10 == null ? "" : Math.round(d.cramps0_10 / 2),
    d.fatigue0_10 == null ? "" : Math.round(d.fatigue0_10 / 2),
    d.stress0_10 == null ? "" : Math.round(d.stress0_10 / 2),
  ].map(esc).join(","));
  return [cols.join(","), ...rows].join("\n");
}

/** Accepts both cadence-export v1 and the shareable web app's day-record v2
 *  backup. Archive-over-delete: merging never drops existing days unless the
 *  import contains the same date (import wins for that date). */
export function importBackup(current: AppState, jsonText: string): AppState {
  const raw = JSON.parse(jsonText) as Record<string, unknown>;
  const next: AppState = JSON.parse(JSON.stringify(current)) as AppState;
  const daysArr: DayRecord[] = Array.isArray(raw.days)
    ? (raw.days as DayRecord[])
    : Array.isArray((raw as { records?: unknown }).records)
      ? ((raw as { records: DayRecord[] }).records)
      : [];
  for (const d of daysArr) {
    if (d && typeof d.localDate === "string") {
      next.days[d.localDate] = { ...defaultDay(d.localDate), ...d };
    }
  }
  if (raw.settings) next.settings = { ...next.settings, ...(raw.settings as AppState["settings"]) };
  if (Array.isArray(raw.medPresets) && raw.medPresets.length) {
    next.medPresets = raw.medPresets as AppState["medPresets"];
  }
  if (Array.isArray(raw.episodes)) next.episodes = raw.episodes as AppState["episodes"];
  if (Array.isArray(raw.assessments)) next.assessments = raw.assessments as AppState["assessments"];
  // day-record v2 backups from the web app keep meds inside each day and a
  // separate med list; both shapes land in medLogs / medPresets above.
  return next;
}

function defaultDay(localDate: string): DayRecord {
  const s = defaultState();
  void s;
  return {
    localDate, cycleDay: null, cyclePct: null, phaseLabel: null, phaseSource: null,
    phaseUserCorrected: false, flow: "none", flowOrdinal0_7: 0, pain0_10: null,
    migraineDay: false, stress0_10: null, anxiety0_10: null, lowMood0_10: null,
    cramps0_10: null, fatigue0_10: null, energy0_10: null, symptoms: {},
    sleep: { bedtime: "23:00", wakeTime: "07:00", quality0_10: null, naps: [] },
    meals: [], waterGlasses: 0, mealRegularity1_5: null, medLogs: [], notes: "",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}
