import type { FlowLabel, PhaseLabel } from "./types";

// Phase priors from the mcPHASES population shapes (mean phase durations
// 6.2 / 7.7 / 7.3 / 10.4 days; transitions at 19.6% / 44.4% / 67.1% of the
// normalised cycle). These are population references only — the user's own
// settings and corrections always override them.
export const PHASE_TRANSITIONS_PCT = [19.6, 44.4, 67.1];

export function phaseForPct(pct: number): PhaseLabel {
  if (pct < PHASE_TRANSITIONS_PCT[0]) return "menstrual";
  if (pct < PHASE_TRANSITIONS_PCT[1]) return "follicular";
  if (pct < PHASE_TRANSITIONS_PCT[2]) return "ovulation";
  return "luteal";
}

export function cycleInfo(
  dateISO: string,
  lastPeriodStart: string,
  cycleLengthDays: number,
): { cycleDay: number; cyclePct: number; phase: PhaseLabel } | null {
  if (!lastPeriodStart) return null;
  const start = new Date(lastPeriodStart + "T12:00:00");
  const date = new Date(dateISO + "T12:00:00");
  const diff = Math.floor((date.getTime() - start.getTime()) / 86400000);
  if (diff < 0) return null;
  const cycleDay = (diff % cycleLengthDays) + 1;
  const cyclePct = ((cycleDay - 1) / cycleLengthDays) * 100;
  return { cycleDay, cyclePct, phase: phaseForPct(cyclePct) };
}

export const FLOW_ORDINAL: Record<FlowLabel, number> = {
  none: 0, spotting: 2, light: 3, medium: 5, heavy: 7,
};

export const PHASE_LABELS: Record<PhaseLabel, string> = {
  menstrual: "Period",
  follicular: "Follicular",
  ovulation: "Ovulation window",
  luteal: "Luteal",
  pms_window: "Pre-period window",
};

/** Normalised 0-1 hormone shape values by cycle % — smoothed population
 *  shapes. E3G/PdG/LH shapes are data-anchored; FSH and testosterone are
 *  educational schematics and are labelled as such in the UI. */
export function hormoneShape(analyte: string, pct: number): number {
  const g = (c: number, w: number) => Math.exp(-((pct - c) ** 2) / (2 * w * w));
  switch (analyte) {
    case "E3G": return Math.min(1, 0.15 + g(50, 16) * 0.95 + g(88, 10) * 0.25);
    case "PdG": return Math.min(1, 0.08 + g(80, 15) * 0.95);
    case "LH": return Math.min(1, 0.1 + g(52, 5) * 1.0);
    case "FSH": return Math.min(1, 0.2 + g(50, 7) * 0.7 + g(4, 8) * 0.3);
    case "testosterone": return Math.min(1, 0.3 + g(48, 12) * 0.45);
    default: return 0;
  }
}
