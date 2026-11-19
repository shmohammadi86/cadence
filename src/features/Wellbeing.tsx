import { useState } from "react";
import { useStore } from "../app/store";
import { INSTRUMENTS, scoreInstrument, type Instrument } from "../domain/scoring";
import { uid, type MoodAssessment } from "../domain/types";
import { todayISO } from "./shared";

export default function Wellbeing() {
  const { state, setState } = useStore();
  const [open, setOpen] = useState<Instrument | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done, setDone] = useState<MoodAssessment | null>(null);

  const start = (inst: Instrument) => { setOpen(inst); setAnswers(Array(inst.questions.length).fill(-1)); setDone(null); };
  const finish = async () => {
    if (!open || answers.some((a) => a < 0)) return;
    const total = scoreInstrument(open, answers);
    const rec: MoodAssessment = {
      id: uid(), localDate: todayISO(), instrument: open.id,
      itemResponses: answers, totalScore: total, maxScore: open.maxScore,
      interpretationBand: open.band(total),
    };
    await setState({ ...state, assessments: [...state.assessments, rec] });
    setDone(rec); setOpen(null);
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>💗 Mood checks</h2>
        <p className="muted">Short, standard questionnaires. The PHQ-2 takes under a minute; the longer ones are for a weekly check-in. Scores are information, not a diagnosis.</p>
        <div className="chips">
          {INSTRUMENTS.map((i) => (
            <button key={i.id} type="button" className="chip" onClick={() => start(i)}>{i.shortTitle} — {i.title.split("—")[1]?.trim() ?? i.title}</button>
          ))}
        </div>
        {done && <p className="note">✓ {done.instrument}: <strong>{done.totalScore} / {done.maxScore}</strong> — {done.interpretationBand}</p>}
        {done?.instrument === "PHQ9" && done.itemResponses[8] > 0 && (
          <p className="note warn">If you ever feel unsafe, please reach out right away: in the US call or text <strong>988</strong>. You deserve support. 💗</p>
        )}
      </section>

      {open && (
        <section className="card">
          <h2>{open.title}</h2>
          <p className="muted">{open.intro}</p>
          {open.questions.map((q, qi) => (
            <div key={qi} className="question">
              <p>{qi + 1}. {q}</p>
              <div className="chips">
                {open.options.map((o, oi) => (
                  <button key={oi} type="button" className={`chip${answers[qi] === oi ? " on" : ""}`}
                    onClick={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          <button type="button" className="primary" disabled={answers.some((a) => a < 0)} onClick={finish}>
            Save {open.shortTitle}</button>
          {answers.some((a) => a < 0) && <p className="muted">Answer every question to save.</p>}
        </section>
      )}

      {state.assessments.length > 0 && (
        <section className="card">
          <h2>Past checks</h2>
          <ul className="plain-list">
            {[...state.assessments].reverse().slice(0, 12).map((a) => (
              <li key={a.id}>{a.localDate} · {a.instrument}: <strong>{a.totalScore}/{a.maxScore}</strong> — {a.interpretationBand}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
