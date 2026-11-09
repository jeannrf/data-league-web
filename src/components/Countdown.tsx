import { useEffect, useState } from "react";
import { FECHA_LIMITE } from "../config";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Cuenta regresiva grande: días, horas, minutos y segundos. */
export default function Countdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = FECHA_LIMITE.getTime() - now;
  if (left <= 0) return <p className="display text-3xl text-accent">Postulaciones cerradas</p>;
  const { d, h, m, s } = parts(left);
  const pad = (n: number) => String(n).padStart(2, "0");
  const cells: [string, string, boolean][] = [[String(d), d === 1 ? "día" : "días", false], [pad(h), "horas", false], [pad(m), "min", false], [pad(s), "seg", true]];
  return (
    <div className="cd" role="timer" aria-label={`Faltan ${d} días, ${h} horas y ${m} minutos para el cierre de postulaciones`}>
      {cells.map(([n, label, tick]) => (
        <div key={label} className={`cd-cell${tick ? " tick" : ""}`} aria-hidden="true">
          <b className="tnum">{n}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
