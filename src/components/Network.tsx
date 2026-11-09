import { useEffect, useMemo, useRef } from "react";
import data from "../data/network.json";

type Props = { className?: string; label?: string; opacity?: number; origin?: boolean; interactive?: boolean; pulses?: boolean; /** Los nodos llegan dispersos, se juntan en el mapa y después se cierran las conexiones. */ assemble?: boolean };
type NodeT = { x: number; y: number; r: number; k: string };

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mapa del Perú hecho de nodos, extraído de la portada del kick-off (scripts/extract-nodes.py). */
export default function Network({ className, label, opacity = 1, origin, interactive, pulses, assemble }: Props) {
  const ref = useRef<SVGSVGElement>(null);
  const { w, h, nodes, edges } = data as { w: number; h: number; nodes: NodeT[]; edges: [number, number][] };

  // El origen de la onda y de la línea continua es Lima. Su posición se estima con las coordenadas reales
  // (12°02′ S, 77°02′ O) sobre el recuadro del Perú (lon −81,33 a −68,65; lat −0,03 a −18,35) y se toma el nodo más cercano.
  const PAD = 14;
  const limaX = PAD + ((-77.04 + 81.33) / (81.33 - 68.65)) * (w - 2 * PAD);
  const limaY = PAD + ((12.05 - 0.03) / (18.35 - 0.03)) * (h - 2 * PAD);
  let originIdx = -1;
  if (origin) nodes.forEach((n, i) => { if (originIdx < 0 || Math.hypot(n.x - limaX, n.y - limaY) < Math.hypot(nodes[originIdx].x - limaX, nodes[originIdx].y - limaY)) originIdx = i; });

  // Con origen, la red se enciende como una onda que sale de ese nodo y se propaga por las líneas reales.
  const hop = useMemo(() => {
    if (originIdx < 0) return null;
    const adj: number[][] = nodes.map(() => []);
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    const dist = nodes.map(() => -1);
    dist[originIdx] = 0;
    const q = [originIdx];
    while (q.length) { const c = q.shift()!; adj[c].forEach((n) => { if (dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } }); }
    const far = Math.max(...dist);
    return dist.map((d) => (d < 0 ? far + 1 : d));
  }, [originIdx, nodes, edges]);
  const delayNode = (i: number) => (hop ? `${hop[i] * 85}ms` : `${Math.round((nodes[i].y / h) * 1100)}ms`);
  const delayEdge = (a: number, b: number) => (hop ? `${Math.min(hop[a], hop[b]) * 85 + 40}ms` : `${Math.round(((nodes[a].y + nodes[b].y) / 2 / h) * 1100)}ms`);

  // Apertura: cada nodo parte de un punto lejano (semilla fija) y las líneas se cierran después, en onda desde Lima.
  const scatter = useMemo(() => {
    const r = rng(77);
    return nodes.map(() => { const a = r() * Math.PI * 2, d = 140 + r() * 200; return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, fd: Math.round(r() * 700) }; });
  }, [nodes]);

  // Pulsos: puntos amarillos que viajan por caminos al azar de la red.
  const walks = useMemo(() => {
    if (!pulses) return [];
    const r = rng(2026);
    const adj: number[][] = nodes.map(() => []);
    edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
    return Array.from({ length: 7 }, (_, k) => {
      let cur = Math.floor(r() * nodes.length), prev = -1;
      const path = [cur];
      for (let s = 0; s < 6; s++) {
        const opts = adj[cur].filter((n) => n !== prev);
        if (!opts.length) break;
        const nxt = opts[Math.floor(r() * opts.length)];
        prev = cur; cur = nxt; path.push(cur);
      }
      return { d: "M" + path.map((i) => `${nodes[i].x},${nodes[i].y}`).join(" L"), dur: 4.2 + r() * 3, begin: 3.6 + k * 0.9 + r() };
    });
  }, [pulses, nodes, edges]);

  useEffect(() => {
    const svg = ref.current;
    if (!interactive || !svg) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const host = svg.closest("section") ?? svg;
    const circles = [...svg.querySelectorAll<SVGCircleElement>("circle.nd")];
    const lines = [...svg.querySelectorAll<SVGLineElement>("line")];
    let raf = 0;
    const leave = () => { circles.forEach((c) => (c.style.transform = "")); lines.forEach((l) => { l.style.strokeOpacity = ""; l.style.strokeWidth = ""; }); };
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = svg.getBoundingClientRect();
        const k = w / r.width;
        const px = (e.clientX - r.left) * k, py = (e.clientY - r.top) * k;
        const infl = nodes.map((n) => Math.max(0, 1 - Math.hypot(n.x - px, n.y - py) / 110));
        circles.forEach((c, i) => (c.style.transform = `scale(${1 + infl[i] * 1.6})`));
        lines.forEach((l, i) => { const [a, b] = edges[i]; const m = Math.max(infl[a], infl[b]); l.style.strokeOpacity = String(0.5 + m * 0.5); l.style.strokeWidth = String(1.2 + m * 1.4); });
      });
    };
    host.addEventListener("pointermove", move as EventListener);
    host.addEventListener("pointerleave", leave);
    return () => { host.removeEventListener("pointermove", move as EventListener); host.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [interactive, w, nodes, edges]);

  const showPulses = pulses && !reduced();
  return (
    <svg
      ref={ref}
      className={`net${assemble ? " assemble" : ""} ${className ?? ""}`}
      viewBox={`0 0 ${w} ${h}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ opacity, aspectRatio: `${w} / ${h}` }}
    >
      {edges.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} style={{ ["--d" as string]: delayEdge(a, b), ["--ld" as string]: `${1300 + (hop ? Math.min(hop[a], hop[b]) * 55 : 0)}ms` }} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} className={`nd k-${n.k}${n.k === "y" && i % 2 === 0 ? " glow" : ""}`}
          data-origin={i === originIdx ? "" : undefined}
          style={{ ["--d" as string]: delayNode(i), ["--dx" as string]: `${scatter[i].dx}px`, ["--dy" as string]: `${scatter[i].dy}px`, ["--fd" as string]: `${scatter[i].fd}ms` }} />
      ))}
      {originIdx >= 0 && (
        <g className="map-label" aria-hidden="true">
          <text x={nodes[originIdx].x - 16} y={nodes[originIdx].y - 2} textAnchor="end" className="ml-name">LIMA</text>
          <text x={nodes[originIdx].x - 16} y={nodes[originIdx].y + 16} textAnchor="end" className="ml-coord">12°02′ S · 77°02′ O</text>
        </g>
      )}
      {showPulses && walks.map((p, i) => (
        <circle key={`p${i}`} r="3.4" className="pulse" opacity="0">
          <animateMotion path={p.d} dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.85;1" dur={`${p.dur}s`} begin={`${p.begin}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}
