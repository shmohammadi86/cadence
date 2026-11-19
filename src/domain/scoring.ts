// Standardised instruments — definitions as data live in
// packages/questionnaire/*.json; scoring bands follow the instruments'
// published, non-diagnostic framing.

export interface Instrument {
  id: "PHQ2" | "PHQ9" | "GAD7" | "PSS4";
  title: string;
  shortTitle: string;
  intro: string;
  options: string[];
  optionScores: number[];
  questions: string[];
  maxScore: number;
  band: (score: number) => string;
}

const FREQ4 = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

export const INSTRUMENTS: Instrument[] = [
  {
    id: "PHQ2", title: "PHQ-2 — quick mood check", shortTitle: "PHQ-2",
    intro: "Over the last 2 weeks, how often have you been bothered by:",
    options: FREQ4, optionScores: [0, 1, 2, 3], maxScore: 6,
    questions: ["Little interest or pleasure in doing things", "Feeling down, depressed, or hopeless"],
    band: (s) => (s >= 3 ? "A score of 3 or more is a common prompt to take the full PHQ-9 or talk with a clinician. This is not a diagnosis." : "Below the usual follow-up threshold. This is not a diagnosis."),
  },
  {
    id: "PHQ9", title: "PHQ-9 — depression symptoms", shortTitle: "PHQ-9",
    intro: "Over the last 2 weeks, how often have you been bothered by:",
    options: FREQ4, optionScores: [0, 1, 2, 3], maxScore: 27,
    questions: [
      "Little interest or pleasure in doing things", "Feeling down, depressed, or hopeless",
      "Trouble falling or staying asleep, or sleeping too much", "Feeling tired or having little energy",
      "Poor appetite or overeating", "Feeling bad about yourself, or that you are a failure",
      "Trouble concentrating on things", "Moving or speaking slowly, or being fidgety/restless",
      "Thoughts that you would be better off dead, or of hurting yourself",
    ],
    band: (s) =>
      s <= 4 ? "Minimal range." : s <= 9 ? "Mild range." : s <= 14 ? "Moderate range — often a prompt to talk with a clinician."
      : s <= 19 ? "Moderately severe range — please consider talking with a clinician soon."
      : "Severe range — please consider reaching out to a clinician or a trusted person soon.",
  },
  {
    id: "GAD7", title: "GAD-7 — anxiety symptoms", shortTitle: "GAD-7",
    intro: "Over the last 2 weeks, how often have you been bothered by:",
    options: FREQ4, optionScores: [0, 1, 2, 3], maxScore: 21,
    questions: [
      "Feeling nervous, anxious, or on edge", "Not being able to stop or control worrying",
      "Worrying too much about different things", "Trouble relaxing",
      "Being so restless it is hard to sit still", "Becoming easily annoyed or irritable",
      "Feeling afraid as if something awful might happen",
    ],
    band: (s) =>
      s <= 4 ? "Minimal range." : s <= 9 ? "Mild range." : s <= 14 ? "Moderate range — often a prompt to talk with a clinician."
      : "Severe range — please consider talking with a clinician soon.",
  },
  {
    id: "PSS4", title: "PSS-4 — perceived stress", shortTitle: "PSS-4",
    intro: "In the last month, how often have you felt:",
    options: ["Never", "Almost never", "Sometimes", "Fairly often", "Very often"],
    optionScores: [0, 1, 2, 3, 4], maxScore: 16,
    questions: [
      "Unable to control the important things in your life",
      "Confident about your ability to handle your personal problems",
      "That things were going your way",
      "Difficulties were piling up so high you could not overcome them",
    ],
    // Items 2 and 3 are reverse-scored.
    band: (s) => (s <= 5 ? "Lower perceived stress range." : s <= 10 ? "Middle perceived stress range." : "Higher perceived stress range."),
  },
];

export function scoreInstrument(inst: Instrument, answers: number[]): number {
  return answers.reduce((sum, optIdx, qIdx) => {
    let v = inst.optionScores[optIdx] ?? 0;
    if (inst.id === "PSS4" && (qIdx === 1 || qIdx === 2)) v = 4 - v;
    return sum + v;
  }, 0);
}
