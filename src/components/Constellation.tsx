import { useEffect, useRef } from "react";

/** Mini red propia de cada track. Al pasar el cursor sobre su fila, los nodos se reacomodan y la red late. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const W = 180, H = 96, N = 9;
const layout = (seed: number) => {
  const r = rng(seed);
  return Array.from({ length: N }, () => ({ x: 12 + r() * (W - 24), y: 12 + r() * (H - 24) }));
};

export default function Constellation({ id }: { id: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const base = parseInt(id, 10) * 7919 + 13;
  const A = layout(base), B = layout(base + 101);
  const r = rng(base + 7);
  const meta = Array.from({ length: N }, (_, i) => ({ r: 2.5 + r() * 3.5, k: i === 0 ? "y" : r() > 0.6 ? "w" : "b" }));
  const edges = new Set<string>();
  A.forEach((a, i) => {
    A.map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) })).filter((o) => o.j !== i).sort((p, q) => p.d - q.d).slice(0, 2)
      .forEach((o) => edges.add(i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`));
  });
  const list = [...edges].map((e) => e.split("-").map(Number) as [number, number]);

  useEffect(() => {
    const el = svg.current;
    const row = el?.closest(".rank-row");
    if (!el || !row) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const circles = [...el.querySelectorAll<SVGCircleElement>("circle")];
    const lines = [...el.querySelectorAll<SVGLineElement>("line")];
    let p = 0, target = 0, raf = 0, t0 = 0;
    const paint = (time: number) => {
      p += (target - p) * 0.09;
      if (Math.abs(target - p) < 0.002) p = target;
      const wob = target ? (time - t0) / 1000 : 0;
      const pos = A.map((a, i) => ({
        x: a.x + (B[i].x - a.x) * p + Math.sin(wob * 2 + i) * 2.2 * p,
        y: a.y + (B[i].y - a.y) * p + Math.cos(wob * 1.7 + i * 1.3) * 2.2 * p,
      }));
      circles.forEach((c, i) => { c.setAttribute("cx", String(pos[i].x)); c.setAttribute("cy", String(pos[i].y)); });
      lines.forEach((l, i) => { const [a, b] = list[i]; l.setAttribute("x1", String(pos[a].x)); l.setAttribute("y1", String(pos[a].y)); l.setAttribute("x2", String(pos[b].x)); l.setAttribute("y2", String(pos[b].y)); });
      if (target || p !== 0) raf = requestAnimationFrame(paint); else raf = 0;
    };
    const go = (v: number) => { target = v; if (v) t0 = performance.now(); if (!raf) raf = requestAnimationFrame(paint); };
    const on = () => go(1), off = () => go(0);
    row.addEventListener("pointerenter", on); row.addEventListener("pointerleave", off);
    row.addEventListener("focusin", on); row.addEventListener("focusout", off);
    return () => { row.removeEventListener("pointerenter", on); row.removeEventListener("pointerleave", off); row.removeEventListener("focusin", on); row.removeEventListener("focusout", off); cancelAnimationFrame(raf); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <svg ref={svg} className="const" viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {list.map(([a, b]) => <line key={`${a}-${b}`} x1={A[a].x} y1={A[a].y} x2={A[b].x} y2={A[b].y} />)}
      {A.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={meta[i].r} className={`k-${meta[i].k}`} />)}
    </svg>
  );
}
