import { useStore } from "../app/store";
import { cycleInfo, FLOW_ORDINAL, PHASE_LABELS } from "../domain/cycle";
import { emptyDay, uid, type FlowLabel, type MealEvent } from "../domain/types";
import Hormones from "./Hormones";
import Meds from "./Meds";
import { DotScale, PainScale } from "./shared";

const SYMPTOMS: { id: string; label: string; icon: string }[] = [
  { id: "nausea", label: "Nausea", icon: "🤢" },
  { id: "light_sensitivity", label: "Light sensitivity", icon: "💡" },
  { id: "sound_sensitivity", label: "Sound sensitivity", icon: "🔊" },
  { id: "aura", label: "Aura / visual changes", icon: "✨" },
  { id: "dizziness", label: "Dizziness", icon: "🌀" },
  { id: "neck_pain", label: "Neck / shoulder pain", icon: "🧣" },
  { id: "brain_fog", label: "Brain fog", icon: "🌫️" },
  { id: "sore_breasts", label: "Sore breasts", icon: "🌷" },
  { id: "bloating", label: "Bloating", icon: "🎈" },
  { id: "appetite_change", label: "Appetite change", icon: "🍽️" },
  { id: "food_cravings", label: "Food cravings", icon: "🍫" },
  { id: "indigestion", label: "Indigestion", icon: "🫧" },
  { id: "mood_swings", label: "Mood swings", icon: "🎭" },
];
const SEVERITY = ["none", "mild", "moderate", "strong"];
const FLOWS: { id: FlowLabel; label: string; icon: string }[] = [
  { id: "none", label: "None", icon: "⚪" }, { id: "spotting", label: "Spotting", icon: "🌸" },
  { id: "light", label: "Light", icon: "💧" }, { id: "medium", label: "Medium", icon: "💧💧" },
  { id: "heavy", label: "Heavy", icon: "💧💧💧" },
];
const MEALS: MealEvent["mealType"][] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_ICONS: Record<string, string> = { breakfast: "🥣", lunch: "🥗", dinner: "🍲", snack: "🍎" };

function sleepMinutes(bed: string, wake: string): number {
  const [bh, bm] = bed.split(":").map(Number);
  const [wh, wm] = wake.split(":").map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins;
}

export default function LogDay(props: { date: string }) {
  const { state, updateDay } = useStore();
  const day = state.days[props.date] ?? emptyDay(props.date);
  const info = cycleInfo(props.date, state.settings.lastPeriodStart, state.settings.cycleLengthDays);
  const phase = day.phaseLabel ?? info?.phase ?? null;
  const pct = day.cyclePct ?? info?.cyclePct ?? null;

  const setSymptom = (id: string, v: number) =>
    updateDay(props.date, { symptoms: { ...day.symptoms, [id]: day.symptoms[id] === v ? 0 : v } });

  const addMeal = (mealType: MealEvent["mealType"], skipped: boolean) =>
    updateDay(props.date, {
      meals: [...day.meals, { id: uid(), mealType, time: new Date().toTimeString().slice(0, 5), note: "", skipped }],
    });

  const mins = sleepMinutes(day.sleep.bedtime, day.sleep.wakeTime);
  const bedH = Number(day.sleep.bedtime.split(":")[0]) + Number(day.sleep.bedtime.split(":")[1]) / 60;
  const sleepStartPct = ((bedH >= 12 ? bedH - 12 : bedH + 12) / 24) * 100;
  const sleepWidth = (mins / (24 * 60)) * 100;

  return (
    <div className="stack">
      <section className="card">
        <h2>🌙 Cycle</h2>
        {info ? (
          <p className="note">Day {info.cycleDay} of about {state.settings.cycleLengthDays} · <strong>{phase ? PHASE_LABELS[phase] : ""}</strong>
            {day.phaseUserCorrected ? " · set by you ✓" : " · estimate"}</p>
        ) : (
          <p className="muted">Add your last period start in Reports → Settings to see cycle estimates here.</p>
        )}
        <div className="phase-bar" aria-hidden>
          {phase && pct != null && <div className="phase-marker" style={{ left: `${pct}%` }}>🌸</div>}
        </div>
        <p className="field-label">Does this phase feel right?</p>
        <div className="chips">
          {(Object.keys(PHASE_LABELS) as (keyof typeof PHASE_LABELS)[]).map((p) => (
            <button key={p} type="button" className={`chip${phase === p ? " on" : ""}`}
              onClick={() => updateDay(props.date, { phaseLabel: p, phaseSource: "user", phaseUserCorrected: true, cyclePct: pct })}>
              {PHASE_LABELS[p]}</button>
          ))}
        </div>
        <p className="field-label">Flow today</p>
        <div className="chips">
          {FLOWS.map((f) => (
            <button key={f.id} type="button" className={`chip${day.flow === f.id ? " on" : ""}`}
              onClick={() => updateDay(props.date, { flow: f.id, flowOrdinal0_7: FLOW_ORDINAL[f.id] })}>
              {f.icon} {f.label}</button>
          ))}
        </div>
      </section>

      <Hormones cyclePct={pct} />

      <section className="card">
        <h2>🤕 Migraine &amp; pain</h2>
        <PainScale value={day.pain0_10} onChange={(v) => updateDay(props.date, { pain0_10: v, migraineDay: v != null && v > 0 ? day.migraineDay : false })} />
        <label className="toggle">
          <input type="checkbox" checked={day.migraineDay}
            onChange={(e) => updateDay(props.date, { migraineDay: e.target.checked })} />
          This was a migraine day
        </label>
      </section>

      <section className="card">
        <h2>🌿 Body &amp; feelings</h2>
        <DotScale label="Cramps" icon="🌸" value={day.cramps0_10} lowLabel="none" highLabel="severe"
          onChange={(v) => updateDay(props.date, { cramps0_10: v })} />
        <DotScale label="Fatigue" icon="🔋" value={day.fatigue0_10} lowLabel="rested" highLabel="exhausted"
          onChange={(v) => updateDay(props.date, { fatigue0_10: v })} />
        <DotScale label="Stress" icon="🌊" value={day.stress0_10} lowLabel="calm" highLabel="overwhelmed"
          onChange={(v) => updateDay(props.date, { stress0_10: v })} />
        <DotScale label="Anxiety" icon="🦋" value={day.anxiety0_10} lowLabel="calm" highLabel="very anxious"
          onChange={(v) => updateDay(props.date, { anxiety0_10: v })} />
        <DotScale label="Low mood" icon="☁️" value={day.lowMood0_10} lowLabel="bright" highLabel="very low"
          onChange={(v) => updateDay(props.date, { lowMood0_10: v })} />
        <DotScale label="Energy" icon="☀️" value={day.energy0_10} lowLabel="empty" highLabel="full"
          onChange={(v) => updateDay(props.date, { energy0_10: v })} />
        <p className="field-label">Other symptoms — tap to set how strong</p>
        <div className="symptom-grid">
          {SYMPTOMS.map((s) => {
            const v = day.symptoms[s.id] ?? 0;
            return (
              <div key={s.id} className={`symptom${v ? " on" : ""}`}>
                <span className="symptom-icon" aria-hidden>{s.icon}</span>
                <span className="symptom-label">{s.label}</span>
                <span className="severity">
                  {[1, 2, 3].map((n) => (
                    <button key={n} type="button" className={`sev${v === n ? " on" : ""}`}
                      aria-label={`${s.label} ${SEVERITY[n]}`} onClick={() => setSymptom(s.id, n)}>{n}</button>
                  ))}
                </span>
                <span className="symptom-state">{SEVERITY[v]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>😴 Sleep &amp; wake</h2>
        <div className="circadian" aria-hidden>
          <div className="circadian-sleep" style={{ left: `${sleepStartPct}%`, width: `${sleepWidth}%` }} />
          <span className="circadian-moon" style={{ left: `${sleepStartPct}%` }}>🌙</span>
          <span className="circadian-sun" style={{ left: `${Math.min(96, sleepStartPct + sleepWidth)}%` }}>☀️</span>
        </div>
        <div className="row">
          <label>Bedtime <input type="time" value={day.sleep.bedtime}
            onChange={(e) => updateDay(props.date, { sleep: { ...day.sleep, bedtime: e.target.value } })} /></label>
          <label>Wake time <input type="time" value={day.sleep.wakeTime}
            onChange={(e) => updateDay(props.date, { sleep: { ...day.sleep, wakeTime: e.target.value } })} /></label>
          <button type="button" className="chip"
            onClick={() => updateDay(props.date, { sleep: { ...day.sleep, bedtime: state.settings.usualBedtime, wakeTime: state.settings.usualWakeTime } })}>
            Same as usual</button>
        </div>
        <p className="note">About {Math.floor(mins / 60)}h {mins % 60}m of sleep.</p>
        <DotScale label="Sleep quality" icon="⭐" value={day.sleep.quality0_10} lowLabel="poor" highLabel="great"
          onChange={(v) => updateDay(props.date, { sleep: { ...day.sleep, quality0_10: v } })} />
      </section>

      <section className="card">
        <h2>🍽️ Food &amp; water</h2>
        <div className="chips">
          {MEALS.map((m) => (
            <span key={m} className="chip-wrap">
              <button type="button" className="chip" onClick={() => addMeal(m, false)}>{MEAL_ICONS[m]} {m}</button>
              <button type="button" className="mini" onClick={() => addMeal(m, true)}>skipped</button>
            </span>
          ))}
        </div>
        {day.meals.length > 0 && (
          <ul className="plain-list">
            {day.meals.map((m) => (
              <li key={m.id}>{MEAL_ICONS[m.mealType]} {m.mealType} · {m.time}{m.skipped ? " · skipped" : ""}</li>
            ))}
          </ul>
        )}
        <p className="field-label">Water 💧 {day.waterGlasses} glasses</p>
        <div className="dots">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button key={n} type="button" className={`dot${day.waterGlasses === n ? " on" : ""}`}
              onClick={() => updateDay(props.date, { waterGlasses: n })}>{n}</button>
          ))}
        </div>
        <p className="field-label">How regular were meals today?</p>
        <div className="dots">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={`dot${day.mealRegularity1_5 === n ? " on" : ""}`}
              onClick={() => updateDay(props.date, { mealRegularity1_5: n })}>{n}</button>
          ))}
          <span className="muted">1 = very irregular · 5 = very regular</span>
        </div>
      </section>

      <Meds date={props.date} />

      <section className="card">
        <h2>📝 Notes</h2>
        <textarea value={day.notes} rows={3} placeholder="Anything else about today…"
          onChange={(e) => updateDay(props.date, { notes: e.target.value })} />
      </section>
    </div>
  );
}
