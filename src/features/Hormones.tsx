import { useState } from "react";
import { hormoneShape, PHASE_TRANSITIONS_PCT } from "../domain/cycle";

const HORMONES = [
  { id: "E3G", label: "Estrogen (E3G)", color: "#e58bb1", note: "Rises toward mid-cycle, falls steeply just before a period. That late fall is the window many people link to menstrual migraine." },
  { id: "PdG", label: "Progesterone (PdG)", color: "#8fbf9f", note: "Low in the first half, rises after ovulation and peaks in the luteal phase, then falls before a period." },
  { id: "LH", label: "LH", color: "#c9a86a", note: "A sharp mid-cycle spike that triggers ovulation." },
  { id: "FSH", label: "FSH — typical pattern", color: "#9aa7d6", note: "Educational schematic only — a typical pattern, not a measurement." },
  { id: "testosterone", label: "Testosterone — typical pattern", color: "#b39ddb", note: "Educational schematic only — a typical pattern, not a measurement." },
];

export default function Hormones(props: { cyclePct: number | null }) {
  const [only, setOnly] = useState<string | null>(null);
  const W = 640, H = 220, PAD = 28;
  const path = (id: string) => {
    const pts: string[] = [];
    for (let p = 0; p <= 100; p += 2) {
      const x = PAD + (p / 100) * (W - PAD * 2);
      const y = H - PAD - hormoneShape(id, p) * (H - PAD * 2);
      pts.push(`${p === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(" ");
  };
  const todayX = props.cyclePct == null ? null : PAD + (props.cyclePct / 100) * (W - PAD * 2);
  const active = HORMONES.find((h) => h.id === only);
  return (
    <section className="card">
      <h2>🌸 Hormones across the cycle</h2>
      <p className="muted">Typical population shapes, drawn across one cycle. Your own pattern is what your logged days build over time — these curves are a guide, not your measurements.</p>
      <div className="chips">
        {HORMONES.map((h) => (
          <button key={h.id} type="button" className={`chip${only === h.id ? " on" : ""}`}
            onClick={() => setOnly(only === h.id ? null : h.id)}>
            <span className="swatch" style={{ background: h.color }} /> {h.label}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="hormone-chart" role="img" aria-label="Hormone curves across the cycle">
        {PHASE_TRANSITIONS_PCT.map((t) => {
          const x = PAD + (t / 100) * (W - PAD * 2);
          return <line key={t} x1={x} y1={10} x2={x} y2={H - PAD} stroke="#ddd3e8" strokeDasharray="4 4" />;
        })}
        {HORMONES.filter((h) => !only || h.id === only).map((h) => (
          <path key={h.id} d={path(h.id)} fill="none" stroke={h.color} strokeWidth={2.5} strokeLinecap="round" />
        ))}
        {todayX != null && <line x1={todayX} y1={10} x2={todayX} y2={H - PAD} stroke="#7a6a9a" strokeWidth={2} />}
        {todayX != null && <text x={todayX + 6} y={20} className="chart-text">you are here</text>}
        <text x={PAD} y={H - 6} className="chart-text">period</text>
        <text x={W / 2 - 30} y={H - 6} className="chart-text">ovulation</text>
        <text x={W - PAD - 40} y={H - 6} className="chart-text">next period</text>
      </svg>
      {active && <p className="note">💡 <strong>{active.label}:</strong> {active.note}</p>}
      {!active && props.cyclePct != null && props.cyclePct > 82 && (
        <p className="note">💡 You are in the late-cycle window where estrogen (E3G) typically falls — a common migraine window for many people. Your Reports show whether that holds for you.</p>
      )}
    </section>
  );
}
