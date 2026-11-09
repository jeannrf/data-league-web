import { useEffect, useRef } from "react";

const N = 300;     // meta: 300+ jóvenes
const FIN = 120;   // 120 llegan a la final
const HUBS = 20;   // 20+ comunidades

export type CrowdState = { phase: 0 | 1 | 2 | 3; c1: number; c2: number; c3: number };

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Escenas dentro del recorrido de scroll (0 a 1). La sección queda fija mientras se recorren.
const S1 = [0.02, 0.3];    // 300 puntos aparecen y se cuentan
const S2 = [0.4, 0.64];    // los 120 de la final se separan en un disco
const S3 = [0.72, 0.95];   // todos se agrupan en 20 comunidades

/**
 * Las metas dibujadas en tres escenas que avanzan con el scroll mientras la sección está fija:
 * 1) 300 personas, 2) 120 pasan a la final, 3) todas se agrupan en 20 comunidades (con 6 finalistas por comunidad).
 */
export default function Crowd({ onState }: { onState?: (s: CrowdState) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    const stage = cv?.closest<HTMLElement>("[data-stage]");
    if (!cv || !stage) return;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = rng(300120);

    // Atributos fijos de cada punto.
    const order = Array.from({ length: N }, (_, i) => i).sort(() => r() - 0.5);     // orden de aparición y de casilla
    const appearRank = new Array<number>(N);
    order.forEach((idx, k) => (appearRank[idx] = k / N));
    const hubOf = (i: number) => i % HUBS;
    const fin = (i: number) => Math.floor(i / HUBS) < FIN / HUBS;                    // 6 finalistas por comunidad
    const jit = Array.from({ length: N }, () => ({ a: r() - 0.5, b: r() - 0.5, ang: r() * Math.PI * 2, rad: Math.sqrt(r()), blue: r() > 0.38, s: r() }));

    // Posiciones en píxeles según el tamaño real del lienzo (se recalculan al cambiar de tamaño).
    let W = 0, H = 0, dpr = 1, k = 1;
    let gx: number[] = [], gy: number[] = [], sx: number[] = [], sy: number[] = [], cx: number[] = [], cy: number[] = [];
    let hubs: { x: number; y: number }[] = [];
    const layout = () => {
      const m = Math.min(W, H);
      k = Math.max(0.8, m / 560);
      // 1) multitud: cuadrícula con desvío, adaptada a la proporción del lienzo
      const cols = Math.max(8, Math.round(Math.sqrt(N * (W / H))));
      const rows = Math.ceil(N / cols);
      const padX = W * 0.07, padY = H * 0.07;
      const cw = (W - padX * 2) / cols, ch = (H - padY * 2) / rows;
      order.forEach((idx, slot) => {
        const c = slot % cols, rw = Math.floor(slot / cols);
        gx[idx] = padX + (c + 0.5 + jit[idx].a * 0.7) * cw;
        gy[idx] = padY + (rw + 0.5 + jit[idx].b * 0.7) * ch;
      });
      // 2) los 120 de la final: disco en espiral al centro
      const step = (0.4 * m) / Math.sqrt(FIN);
      let n = 0;
      for (let i = 0; i < N; i++) {
        if (fin(i)) {
          const rad = step * Math.sqrt(n + 0.5), ang = n * 2.399963;
          sx[i] = W / 2 + Math.cos(ang) * rad; sy[i] = H / 2 + Math.sin(ang) * rad; n++;
        } else { sx[i] = gx[i]; sy[i] = gy[i]; }
      }
      // 3) 20 comunidades: cuadrícula de centros (5×4 en horizontal, 4×5 en vertical)
      const hc = W > H * 1.1 ? 5 : 4, hr = HUBS / hc;
      const cell = Math.min((W * 0.92) / hc, (H * 0.92) / hr);
      const ox = (W - cell * hc) / 2, oy = (H - cell * hr) / 2;
      hubs = Array.from({ length: HUBS }, (_, h) => ({ x: ox + ((h % hc) + 0.5) * cell + Math.sin(h * 7.1) * cell * 0.06, y: oy + (Math.floor(h / hc) + 0.5) * cell + Math.cos(h * 5.3) * cell * 0.06 }));
      for (let i = 0; i < N; i++) {
        const hb = hubs[hubOf(i)];
        cx[i] = hb.x + Math.cos(jit[i].ang) * jit[i].rad * cell * 0.36;
        cy[i] = hb.y + Math.sin(jit[i].ang) * jit[i].rad * cell * 0.36;
      }
    };

    let target = 0, shown = -1, last: CrowdState = { phase: 9 as 0, c1: -1, c2: -1, c3: -1 };
    const readTarget = () => {
      if (reduce) return 1;
      const b = stage.getBoundingClientRect();
      const travel = b.height - window.innerHeight;
      return travel <= 0 ? 1 : clamp(-b.top / travel);
    };

    const COL = { blue: "#4162ff", white: "#f2f5fa", yellow: "#ffde41" };
    const draw = (p: number) => {
      ctx.clearRect(0, 0, W, H);
      const a1 = clamp((p - S1[0]) / (S1[1] - S1[0]));
      const e2 = easeInOut(clamp((p - S2[0]) / (S2[1] - S2[0])));
      const e3 = easeInOut(clamp((p - S3[0]) / (S3[1] - S3[0])));
      const lit = easeOut(clamp((p - (S2[0] - 0.05)) / 0.12));   // los 120 se encienden justo antes de moverse
      const px = new Array<number>(N), py = new Array<number>(N);
      for (let i = 0; i < N; i++) {
        const x2 = gx[i] + (sx[i] - gx[i]) * e2, y2 = gy[i] + (sy[i] - gy[i]) * e2;
        px[i] = x2 + (cx[i] - x2) * e3; py[i] = y2 + (cy[i] - y2) * e3;
      }
      // líneas a la comunidad (escena 3)
      if (e3 > 0) {
        ctx.lineWidth = 1.2 * k;
        for (let i = 0; i < N; i++) {
          const hb = hubs[hubOf(i)];
          ctx.strokeStyle = `rgba(65,98,255,${0.55 * e3})`;
          ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(hb.x, hb.y); ctx.stroke();
        }
      }
      for (let i = 0; i < N; i++) {
        const born = clamp((a1 - appearRank[i] * 0.9) * 10);
        if (born <= 0) continue;
        const f = fin(i);
        const dim = f ? 1 : 1 - 0.78 * e2 * (1 - e3);
        const L = f ? lit : 0;
        const base = (3.4 + jit[i].s * 2.4) * k;
        const rad = base * (1 + L * 0.55) * (0.3 + 0.7 * easeOut(born));
        ctx.globalAlpha = clamp(born * 1.2) * dim;
        ctx.fillStyle = L > 0.45 ? COL.yellow : jit[i].blue ? COL.blue : COL.white;
        ctx.beginPath(); ctx.arc(px[i], py[i], rad, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (e3 > 0) {
        for (const hb of hubs) {
          ctx.fillStyle = COL.white; ctx.strokeStyle = "#070a10"; ctx.lineWidth = 3 * k;
          ctx.beginPath(); ctx.arc(hb.x, hb.y, 7.5 * k * e3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      // estado para el texto
      const phase = (p < S1[0] ? 0 : p < 0.35 ? 1 : p < 0.68 ? 2 : 3) as 0 | 1 | 2 | 3;
      const next: CrowdState = { phase, c1: Math.round(N * easeOut(a1)), c2: Math.round(FIN * easeOut(clamp((p - S2[0]) / (S2[1] - S2[0])))), c3: Math.round(HUBS * easeOut(clamp((p - S3[0]) / (S3[1] - S3[0])))) };
      if (next.phase !== last.phase || next.c1 !== last.c1 || next.c2 !== last.c2 || next.c3 !== last.c3) { last = next; onState?.(next); }
    };

    // El avance mostrado persigue al del scroll con suavizado: así las escenas se aprecian aunque se scrollee rápido.
    let raf = 0;
    const loop = () => {
      if (!W || !H) return;
      target = readTarget();
      shown = shown < 0 ? target : shown + (target - shown) * (reduce ? 1 : 0.06);
      if (Math.abs(target - shown) < 0.0006) shown = target;
      draw(shown);
      raf = shown === target ? 0 : requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const size = () => {
      const b = cv.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = b.width; H = b.height;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout();
      shown = -1; last = { phase: 9 as 0, c1: -1, c2: -1, c3: -1 };
      loop();
    };
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    size();
    return () => { ro.disconnect(); window.removeEventListener("scroll", kick); window.removeEventListener("resize", kick); cancelAnimationFrame(raf); };
  }, [onState]);

  return <canvas ref={canvas} className="block h-full w-full" aria-hidden="true" />;
}
