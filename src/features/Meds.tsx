import { useMemo, useState } from "react";
import { useStore } from "../app/store";
import { uid, type MedLog, type MedPreset } from "../domain/types";

const UNITS = ["mg", "ml", "tablet", "capsule", "spray", "drop"];
const HELPED: { id: MedLog["helped"]; label: string }[] = [
  { id: "none", label: "Not really" }, { id: "a_little", label: "A little" },
  { id: "moderately", label: "Moderately" }, { id: "a_lot", label: "A lot" },
];

function normaliseName(name: string): string {
  const t = name.trim().replace(/\s+/g, " ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/** Meds: name and dose are separate fields everywhere. Adding a med uses a
 *  type-to-match combobox over the preset list + her own additions, so the
 *  same spelling is reused instead of creating duplicates (data consistency
 *  without any online lookup). */
export default function Meds(props: { date: string }) {
  const { state, setState, updateDay } = useStore();
  const day = state.days[props.date];
  const logs = day?.medLogs ?? [];
  const [pick, setPick] = useState<MedPreset | null>(null);
  const [dose, setDose] = useState("");
  const [unit, setUnit] = useState("mg");
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [query, setQuery] = useState("");
  const [newDose, setNewDose] = useState("");
  const [newUnit, setNewUnit] = useState("mg");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return state.medPresets.filter((p) => p.isActive && p.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, state.medPresets]);

  const choose = (p: MedPreset) => {
    setPick(p);
    setDose(p.defaultDoseValue == null ? "" : String(p.defaultDoseValue));
    setUnit(p.defaultDoseUnit);
  };

  const addAsNew = async () => {
    const name = normaliseName(query);
    if (!name) return;
    const preset: MedPreset = {
      id: uid(), name, defaultDoseValue: newDose ? Number(newDose) : null,
      defaultDoseUnit: newUnit, medClass: "other", isActive: true,
      sortOrder: state.medPresets.length + 1,
    };
    await setState({ ...state, medPresets: [...state.medPresets, preset] });
    setQuery("");
    choose(preset);
  };

  const confirmLog = async () => {
    if (!pick) return;
    const log: MedLog = {
      id: uid(), medName: pick.name,
      doseValue: dose ? Number(dose) : null, doseUnit: unit,
      takenAt: time, helped: null,
    };
    await updateDay(props.date, { medLogs: [...logs, log] });
    setPick(null);
  };

  const setHelped = (id: string, helped: MedLog["helped"]) =>
    updateDay(props.date, { medLogs: logs.map((l) => (l.id === id ? { ...l, helped } : l)) });

  const removePreset = (id: string) =>
    setState({ ...state, medPresets: state.medPresets.map((p) => (p.id === id ? { ...p, isActive: false } : p)) });

  return (
    <section className="card">
      <h2>💊 Medicines</h2>
      <p className="muted">Tap a medicine, confirm the dose separately, done.</p>
      <div className="chips">
        {state.medPresets.filter((p) => p.isActive).map((p) => (
          <span key={p.id} className="chip-wrap">
            <button type="button" className={`chip${pick?.id === p.id ? " on" : ""}`} onClick={() => choose(p)}>
              {p.name}{p.defaultDoseValue != null ? ` · ${p.defaultDoseValue} ${p.defaultDoseUnit}` : ""}
            </button>
            <button type="button" className="chip-x" aria-label={`Remove ${p.name}`} onClick={() => removePreset(p.id)}>×</button>
          </span>
        ))}
      </div>

      {pick && (
        <div className="med-confirm">
          <strong>{pick.name}</strong>
          <label>Dose <input inputMode="decimal" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="amount" /></label>
          <label>Unit
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </label>
          <label>Time <input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
          <button type="button" className="primary" onClick={confirmLog}>Log {pick.name}</button>
        </div>
      )}

      <div className="med-add">
        <label className="field-label" htmlFor="med-search">Add a medicine (start typing to match your list)</label>
        <input id="med-search" list="med-name-list" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Feverfew" autoComplete="off" />
        <datalist id="med-name-list">
          {state.medPresets.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.name} />)}
        </datalist>
        {query.trim() && (
          <div className="med-matches">
            {matches.map((p) => (
              <button key={p.id} type="button" className="chip" onClick={() => { setQuery(""); choose(p); }}>{p.name}</button>
            ))}
            {!matches.some((p) => p.name.toLowerCase() === query.trim().toLowerCase()) && (
              <span className="med-new">
                <input inputMode="decimal" placeholder="usual dose" value={newDose} onChange={(e) => setNewDose(e.target.value)} />
                <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
                <button type="button" className="chip on" onClick={addAsNew}>Add “{normaliseName(query)}” as new</button>
              </span>
            )}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <ul className="med-logs">
          {logs.map((l) => (
            <li key={l.id}>
              <span>💊 <strong>{l.medName}</strong>{l.doseValue != null ? ` — ${l.doseValue} ${l.doseUnit}` : ""} · {l.takenAt}</span>
              <span className="helped">
                Helped? {HELPED.map((h) => (
                  <button key={h.id ?? ""} type="button" className={`mini${l.helped === h.id ? " on" : ""}`}
                    onClick={() => setHelped(l.id, h.id)}>{h.label}</button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
