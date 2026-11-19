export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function prettyDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });
}

/** 0-10 dot scale with a face that follows the value. */
export function DotScale(props: {
  label: string; icon: string; value: number | null;
  onChange: (v: number | null) => void; lowLabel: string; highLabel: string;
}) {
  const faces = ["😌", "🙂", "😐", "😕", "😣", "😖"];
  const face = props.value == null ? "💭" : faces[Math.min(5, Math.round(props.value / 2))];
  return (
    <div className="scale-row">
      <div className="scale-head">
        <span className="scale-label">{props.icon} {props.label}</span>
        <span className="scale-face" aria-hidden>{face}</span>
        <span className="scale-value">{props.value == null ? "not set" : `${props.value} / 10`}</span>
      </div>
      <div className="dots" role="radiogroup" aria-label={props.label}>
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={props.value === i}
            className={`dot${props.value === i ? " on" : ""}${props.value != null && i < props.value ? " fill" : ""}`}
            onClick={() => props.onChange(props.value === i ? null : i)}>{i}</button>
        ))}
      </div>
      <div className="scale-ends"><span>{props.lowLabel}</span><span>{props.highLabel}</span></div>
    </div>
  );
}

export function PainScale(props: { value: number | null; onChange: (v: number | null) => void }) {
  const faces = ["😊", "🙂", "🙂", "😐", "😐", "😕", "😕", "😣", "😣", "😖", "😖"];
  return (
    <div className="pain-scale">
      <div className="pain-face" aria-hidden>{props.value == null ? "💭" : faces[props.value]}</div>
      <div className="dots big" role="radiogroup" aria-label="Migraine pain level">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={props.value === i}
            className={`dot${props.value === i ? " on" : ""}`}
            onClick={() => props.onChange(props.value === i ? null : i)}>{i}</button>
        ))}
      </div>
      <div className="scale-ends"><span>no pain</span><span>worst pain</span></div>
    </div>
  );
}
