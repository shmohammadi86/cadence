import { useRef, useState } from "react";
import { useStore } from "../app/store";
import { PHASE_LABELS } from "../domain/cycle";
import { download, exportCSV, exportJSON, importBackup } from "../domain/export";
import { defaultState } from "../domain/types";

function avg(vals: (number | null | undefined)[]): string {
  const xs = vals.filter((v): v is number => v != null);
  return xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : "—";
}

export default function Reports(props: { goLog: (date: string) => void }) {
  const { state, setState, replace, repo } = useStore();
  const days = Object.values(state.days).sort((a, b) => b.localDate.localeCompare(a.localDate));
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const last14 = [...days].slice(0, 14).reverse();
  const maxPain = 10;

  const doImport = async (f: File) => {
    try {
      const text = await f.text();
      const merged = importBackup(state, text);
      await replace(merged);
      setMsg(`✓ Backup imported — ${Object.keys(merged.days).length} days on this device now.`);
    } catch {
      setMsg("That file could not be read as a backup. Nothing was changed.");
    }
  };

  return (
    <div className="stack">
      <section className="card">
        <h2>📊 At a glance</h2>
        <div className="stat-grid">
          <div className="stat"><span className="stat-num">{days.length}</span><span>days logged</span></div>
          <div className="stat"><span className="stat-num">{avg(days.map((d) => d.pain0_10))}</span><span>average pain</span></div>
          <div className="stat"><span className="stat-num">{days.filter((d) => d.migraineDay).length}</span><span>migraine days</span></div>
          <div className="stat"><span className="stat-num">{avg(days.map((d) => d.fatigue0_10))}</span><span>average fatigue</span></div>
          <div className="stat"><span className="stat-num">{avg(days.map((d) => d.cramps0_10))}</span><span>average cramps</span></div>
          <div className="stat"><span className="stat-num">{avg(days.map((d) => d.stress0_10))}</span><span>average stress</span></div>
        </div>
        {last14.length > 1 && (
          <>
            <p className="field-label">Pain, last {last14.length} logged days</p>
            <div className="bars">
              {last14.map((d) => (
                <div key={d.localDate} className="bar-col" title={`${d.localDate}: pain ${d.pain0_10 ?? "—"}`}>
                  <div className={`bar${d.migraineDay ? " migraine" : ""}`}
                    style={{ height: `${Math.max(4, ((d.pain0_10 ?? 0) / maxPain) * 100)}%` }} />
                  <span className="bar-day">{d.localDate.slice(8)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2>🔍 Patterns so far</h2>
        <PatternLines />
      </section>

      <section className="card">
        <h2>🗓️ Your days</h2>
        {days.length === 0 && <p className="muted">Nothing logged yet. Your first day is one tap away in Log.</p>}
        <ul className="day-list">
          {days.slice(0, 31).map((d) => (
            <li key={d.localDate}>
              <button type="button" className="day-row" onClick={() => props.goLog(d.localDate)}>
                <span>{d.localDate}</span>
                <span>{d.phaseLabel ? PHASE_LABELS[d.phaseLabel] : ""}</span>
                <span>{d.pain0_10 != null ? `pain ${d.pain0_10}` : "no pain set"}</span>
                <span>{d.migraineDay ? "🤕 migraine" : ""}</span>
                <span className="muted">edit →</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" id="settings">
        <h2>⚙️ Settings</h2>
        <label>Last period started
          <input type="date" value={state.settings.lastPeriodStart}
            onChange={(e) => setState({ ...state, settings: { ...state.settings, lastPeriodStart: e.target.value } })} /></label>
        <label>Usual cycle length (days)
          <input type="number" min={15} max={60} value={state.settings.cycleLengthDays}
            onChange={(e) => setState({ ...state, settings: { ...state.settings, cycleLengthDays: Number(e.target.value) || 28 } })} /></label>
        <label>Usual period length (days)
          <input type="number" min={1} max={15} value={state.settings.periodLengthDays}
            onChange={(e) => setState({ ...state, settings: { ...state.settings, periodLengthDays: Number(e.target.value) || 5 } })} /></label>
        <label>Usual bedtime
          <input type="time" value={state.settings.usualBedtime}
            onChange={(e) => setState({ ...state, settings: { ...state.settings, usualBedtime: e.target.value } })} /></label>
        <label>Usual wake time
          <input type="time" value={state.settings.usualWakeTime}
            onChange={(e) => setState({ ...state, settings: { ...state.settings, usualWakeTime: e.target.value } })} /></label>
      </section>

      <section className="card">
        <h2>💾 Storage &amp; backup</h2>
        <p className="muted">
          {repo.kind === "tauri-sqlite"
            ? "Saved in a local SQLite database on this device (cadence.sqlite3 in the app data folder). No account, no server."
            : "Saved on this device in this browser. No account, no server."}{" "}
          {days.length} days stored.
        </p>
        <div className="chips">
          <button type="button" className="chip" onClick={() => download("cadence-backup.json", exportJSON(state))}>⬇ Export backup (JSON)</button>
          <button type="button" className="chip" onClick={() => download("cadence-summary.csv", exportCSV(state), "text/csv")}>⬇ Summary (CSV)</button>
          <button type="button" className="chip" onClick={() => fileRef.current?.click()}>⬆ Import backup</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ""; }} />
        {msg && <p className="note">{msg}</p>}
        {!confirmDelete
          ? <button type="button" className="danger" onClick={() => setConfirmDelete(true)}>Delete all my data</button>
          : <span className="row">
              <span>Really delete everything on this device?</span>
              <button type="button" className="danger" onClick={async () => { await repo.clear(); await replace(defaultState()); setConfirmDelete(false); }}>Yes, delete all</button>
              <button type="button" className="chip" onClick={() => setConfirmDelete(false)}>Keep my data</button>
            </span>}
        <p className="muted small">Coming later: pattern-finding models that learn across many people&apos;s consented, de-identified records. Nothing leaves this device until you export it yourself.</p>
      </section>
    </div>
  );
}

function PatternLines() {
  const { state } = useStore();
  const days = Object.values(state.days);
  if (days.length < 4) return <p className="muted">Patterns appear after a few logged days — each day is kept as one joined record (cycle, pain, body signals, sleep, food, medicines, mood), so they are easy to read together.</p>;
  const byPhase = new Map<string, number[]>();
  for (const d of days) {
    if (d.phaseLabel && d.pain0_10 != null) {
      const arr = byPhase.get(d.phaseLabel) ?? []; arr.push(d.pain0_10); byPhase.set(d.phaseLabel, arr);
    }
  }
  const lines = [...byPhase.entries()].map(([p, xs]) => ({
    p, avg: xs.reduce((a, b) => a + b, 0) / xs.length, n: xs.length,
  })).sort((a, b) => b.avg - a.avg);
  const mig = days.filter((d) => d.migraineDay);
  const calm = days.filter((d) => !d.migraineDay);
  return (
    <ul className="plain-list">
      {lines.map((l) => (
        <li key={l.p}>Highest average pain so far is in <strong>{PHASE_LABELS[l.p as keyof typeof PHASE_LABELS]}</strong>: {l.avg.toFixed(1)}/10 across {l.n} days.</li>
      )).slice(0, 1)}
      {mig.length > 0 && calm.length > 0 && (
        <li>On migraine days, average stress was {avg(mig.map((d) => d.stress0_10))} vs {avg(calm.map((d) => d.stress0_10))} on other days; fatigue {avg(mig.map((d) => d.fatigue0_10))} vs {avg(calm.map((d) => d.fatigue0_10))}.</li>
      )}
      <li className="muted">Simple averages from your own days only — not medical conclusions.</li>
    </ul>
  );
}
