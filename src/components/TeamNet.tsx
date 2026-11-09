type Props = {
  /** Iniciales de quienes ya están en el equipo, además de ti. */
  members: string[];
  /** Postulación individual que pide equipo: se dibuja un nodo "por asignar". */
  ghost?: boolean;
  className?: string;
};

// Posiciones fijas (viewBox 260×200): tú al centro, hasta tres integrantes alrededor.
const ME = { x: 130, y: 100 };
const SLOTS = [{ x: 46, y: 52 }, { x: 214, y: 52 }, { x: 130, y: 168 }];

/** Tu equipo como red: un nodo por persona, que aparece o se desprende al agregar o quitar integrantes. */
export default function TeamNet({ members, ghost, className }: Props) {
  const n = members.length;
  return (
    <svg className={`team ${className ?? ""}`} viewBox="0 0 260 200" role="img" aria-label={n ? `Tu equipo: tú y ${n} persona${n > 1 ? "s" : ""} más` : "Tu equipo: solo tú por ahora"}>
      {/* líneas entre integrantes */}
      {SLOTS.map((a, i) => SLOTS.slice(i + 1).map((b, j) => (
        <line key={`m${i}-${i + 1 + j}`} className={`t-line soft ${i < n && i + 1 + j < n ? "on" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      )))}
      {SLOTS.map((s, i) => (
        <line key={`l${i}`} className={`t-line ${i < n ? "on" : ""}`} x1={ME.x} y1={ME.y} x2={s.x} y2={s.y} />
      ))}
      {ghost && n === 0 && (
        <g className="ghost">
          <line x1={ME.x} y1={ME.y} x2={SLOTS[1].x} y2={SLOTS[1].y} />
          <circle cx={SLOTS[1].x} cy={SLOTS[1].y} r="15" />
          <text x={SLOTS[1].x} y={SLOTS[1].y + 5} textAnchor="middle">?</text>
        </g>
      )}
      {SLOTS.map((s, i) => (
        <g key={i} className={`t-node ${i < n ? "on" : ""}`} style={{ transformOrigin: `${s.x}px ${s.y}px` }}>
          <circle cx={s.x} cy={s.y} r="15" />
          <text x={s.x} y={s.y + 5} textAnchor="middle">{members[i] ?? ""}</text>
        </g>
      ))}
      <g className="t-me">
        <circle cx={ME.x} cy={ME.y} r="19" />
        <text x={ME.x} y={ME.y + 5} textAnchor="middle">TÚ</text>
      </g>
    </svg>
  );
}
