import { useEffect, useState } from "react";
import { useStore } from "./app/store";
import LogDay from "./features/LogDay";
import Reports from "./features/Reports";
import Wellbeing from "./features/Wellbeing";
import { prettyDate, todayISO } from "./features/shared";

type Mode = "log" | "reports";
type LogTab = "today" | "wellbeing";

export default function App() {
  const { init, loaded, repo } = useStore();
  const [mode, setMode] = useState<Mode>("log");
  const [logTab, setLogTab] = useState<LogTab>("today");
  const [date, setDate] = useState(todayISO());

  useEffect(() => { void init(); }, [init]);
  if (!loaded) return <main className="app"><p className="muted">Opening Cadence… 🌸</p></main>;

  return (
    <main className="app">
      <header className="hero">
        <h1>🌸 Cadence</h1>
        <p className="muted">Migraine &amp; cycle companion — calm, private, on your device.</p>
        <div className="mode-switch" role="tablist" aria-label="Main sections">
          <button type="button" role="tab" aria-selected={mode === "log"}
            className={mode === "log" ? "on" : ""} onClick={() => setMode("log")}>✏️ Log</button>
          <button type="button" role="tab" aria-selected={mode === "reports"}
            className={mode === "reports" ? "on" : ""} onClick={() => setMode("reports")}>📊 Reports</button>
        </div>
        <p className="muted small">{mode === "log" ? "Log is where you add today. It takes about a minute." : "Reports is view-only — your summary, patterns, settings and backup."}</p>
      </header>

      {mode === "log" ? (
        <>
          <div className="row spread">
            <label>Date <input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <span className="muted">{prettyDate(date)}</span>
          </div>
          <div className="subtabs">
            <button type="button" className={logTab === "today" ? "on" : ""} onClick={() => setLogTab("today")}>Today&apos;s check-in</button>
            <button type="button" className={logTab === "wellbeing" ? "on" : ""} onClick={() => setLogTab("wellbeing")}>Mood checks</button>
          </div>
          {logTab === "today" ? <LogDay date={date} /> : <Wellbeing />}
        </>
      ) : (
        <Reports goLog={(d) => { setDate(d); setMode("log"); setLogTab("today"); }} />
      )}

      <footer className="muted small">
        Storage: {repo.kind === "tauri-sqlite" ? "local SQLite on this device" : "this browser, on this device"} · No account · Nothing is sent anywhere.
      </footer>
    </main>
  );
}
