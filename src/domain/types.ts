// Cadence domain types — one participant-day record is the core unit.
// Field names and scales mirror packages/schema (the shared schema package)
// and the shareable web app's backup format (day-record v2), so a browser
// export imports into the Tauri SQLite database with no re-entry.

export type PhaseLabel =
  | "menstrual"
  | "follicular"
  | "ovulation"
  | "luteal"
  | "pms_window";

export type FlowLabel = "none" | "spotting" | "light" | "medium" | "heavy";

export interface MedLog {
  id: string;
  medName: string; // medication name — always separate from dose
  doseValue: number | null;
  doseUnit: string; // mg | ml | tablet | capsule | spray | drop
  takenAt: string; // HH:MM local
  helped: "none" | "a_little" | "moderately" | "a_lot" | null;
}

export interface MedPreset {
  id: string;
  name: string;
  defaultDoseValue: number | null;
  defaultDoseUnit: string;
  medClass: "acute" | "preventive" | "supplement" | "hormonal" | "anti_nausea" | "other";
  isActive: boolean;
  sortOrder: number;
}

export interface MealEvent {
  id: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  time: string; // HH:MM local
  note: string;
  skipped: boolean;
}

export interface SleepRecord {
  bedtime: string; // HH:MM local
  wakeTime: string; // HH:MM local
  quality0_10: number | null;
  naps: { start: string; minutes: number }[];
}

export interface DayRecord {
  localDate: string; // YYYY-MM-DD, primary key with participant
  cycleDay: number | null;
  cyclePct: number | null; // 0-100 normalised position in cycle
  phaseLabel: PhaseLabel | null;
  phaseSource: "user" | "calendar" | "hormone_test" | "model" | null;
  phaseUserCorrected: boolean;
  flow: FlowLabel;
  flowOrdinal0_7: number; // mcPHASES-aligned ordinal under the chip UI
  pain0_10: number | null;
  migraineDay: boolean;
  // Body & feelings — native 0-10 sliders
  stress0_10: number | null;
  anxiety0_10: number | null;
  lowMood0_10: number | null;
  cramps0_10: number | null;
  fatigue0_10: number | null;
  energy0_10: number | null;
  /** Symptom severities 0-3, keyed by symptom id (see SYMPTOMS in LogDay). */
  symptoms: Record<string, number>;
  sleep: SleepRecord;
  meals: MealEvent[];
  waterGlasses: number;
  mealRegularity1_5: number | null;
  medLogs: MedLog[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface MigraineEpisode {
  id: string;
  localDate: string;
  startedAt: string;
  durationMin: number | null;
  painPeak0_10: number | null;
  location: string;
  painType: string;
  aura: boolean;
  symptoms: Record<string, number>; // 0-3 severities
}

export interface MoodAssessment {
  id: string;
  localDate: string;
  instrument: "PHQ2" | "PHQ9" | "GAD7" | "PSS4" | "QUICK_DAILY";
  itemResponses: number[];
  totalScore: number;
  maxScore: number;
  interpretationBand: string;
}

export interface CycleSettings {
  lastPeriodStart: string; // YYYY-MM-DD or ""
  cycleLengthDays: number;
  periodLengthDays: number;
  usualBedtime: string;
  usualWakeTime: string;
}

export interface AppState {
  participantUuid: string;
  settings: CycleSettings;
  days: Record<string, DayRecord>;
  episodes: MigraineEpisode[];
  assessments: MoodAssessment[];
  medPresets: MedPreset[];
}

export const DEFAULT_MED_PRESETS: Omit<MedPreset, "id">[] = [
  { name: "Ibuprofen", defaultDoseValue: 400, defaultDoseUnit: "mg", medClass: "acute", isActive: true, sortOrder: 1 },
  { name: "Acetaminophen / Paracetamol", defaultDoseValue: 1000, defaultDoseUnit: "mg", medClass: "acute", isActive: true, sortOrder: 2 },
  { name: "Sumatriptan", defaultDoseValue: 50, defaultDoseUnit: "mg", medClass: "acute", isActive: true, sortOrder: 3 },
  { name: "Rizatriptan", defaultDoseValue: 10, defaultDoseUnit: "mg", medClass: "acute", isActive: true, sortOrder: 4 },
  { name: "Naproxen", defaultDoseValue: 500, defaultDoseUnit: "mg", medClass: "acute", isActive: true, sortOrder: 5 },
  { name: "Magnesium", defaultDoseValue: 400, defaultDoseUnit: "mg", medClass: "supplement", isActive: true, sortOrder: 6 },
  { name: "Riboflavin (B2)", defaultDoseValue: 400, defaultDoseUnit: "mg", medClass: "supplement", isActive: true, sortOrder: 7 },
  { name: "CoQ10", defaultDoseValue: 100, defaultDoseUnit: "mg", medClass: "supplement", isActive: true, sortOrder: 8 },
  { name: "Anti-nausea medication", defaultDoseValue: null, defaultDoseUnit: "tablet", medClass: "anti_nausea", isActive: true, sortOrder: 9 },
  { name: "Hormonal contraceptive", defaultDoseValue: null, defaultDoseUnit: "tablet", medClass: "hormonal", isActive: true, sortOrder: 10 },
];

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function emptyDay(localDate: string): DayRecord {
  const now = new Date().toISOString();
  return {
    localDate, cycleDay: null, cyclePct: null, phaseLabel: null,
    phaseSource: null, phaseUserCorrected: false, flow: "none", flowOrdinal0_7: 0,
    pain0_10: null, migraineDay: false,
    stress0_10: null, anxiety0_10: null, lowMood0_10: null,
    cramps0_10: null, fatigue0_10: null, energy0_10: null,
    symptoms: {},
    sleep: { bedtime: "23:00", wakeTime: "07:00", quality0_10: null, naps: [] },
    meals: [], waterGlasses: 0, mealRegularity1_5: null,
    medLogs: [], notes: "", createdAt: now, updatedAt: now,
  };
}

export function defaultState(): AppState {
  return {
    participantUuid: uid() + uid(),
    settings: { lastPeriodStart: "", cycleLengthDays: 28, periodLengthDays: 5, usualBedtime: "23:00", usualWakeTime: "07:00" },
    days: {}, episodes: [], assessments: [],
    medPresets: DEFAULT_MED_PRESETS.map((p, i) => ({ ...p, id: `preset-${i + 1}` })),
  };
}
