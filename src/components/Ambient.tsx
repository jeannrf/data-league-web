import { useEffect, useRef } from "react";

type P = { x: number; y: number; vx: number; vy: number; r: number; c: string };

const COLORS = ["#4162ff", "#4162ff", "#4162ff", "#f2f5fa", "#ffde41"];

/** Generador con semilla fija: el fondo arranca igual en cada carga (mismas posiciones, velocidades y pulsos). */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fondo vivo de la página: una red de nodos que deriva despacio detrás del contenido, se conecta con el cursor,
 * mueve un poco con el scroll y de vez en cuando manda un pulso por una línea.
 * Se apaga con suavidad en las secciones marcadas con data-ambient="off" (las que ya tienen su propia animación)
 * y reaparece en las demás.
 */
export default function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 700;
    let W = 0, H = 0, dpr = 1;
    let pts: P[] = [];
    const ptr = { x: -999, y: -999, on: false };
    const pulses: { a: number; b: number; t: number }[] = [];
    let raf = 0, last = 0, nextPulse = 0, frame = 0;
    let target = 0, cur = 0;   // 0 = apagado, 1 = visible

    const rand = rng(2026);
    const seed = () => {
      const rand0 = rng(2026);
      const n = Math.max(22, Math.min(small ? 30 : 64, Math.round((W * H) / (small ? 16000 : 26000))));
      pts = Array.from({ length: n }, (_, i) => {
        const sp = 5 + rand0() * 9, a = rand0() * Math.PI * 2;
        return { x: rand0() * W, y: rand0() * H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1.4 + rand0() * 2.2, c: COLORS[i % COLORS.length] };
      });
    };
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
      measure(); cur = target; draw(0, true);
    };

    // Cuánto del alto de la pantalla ocupan las secciones con animación propia: de eso depende si se ve el fondo.
    const measure = () => {
      let cover = 0;
      document.querySelectorAll<HTMLElement>('[data-ambient="off"]').forEach((el) => {
        const r = el.getBoundingClientRect();
        cover += Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
      });
      target = 1 - Math.min(1, cover / (H * 0.5));
    };
    // Tenue para no competir con el contenido.
    const level = () => cur * 0.55;

    function draw(dt: number, still = false) {
      const al = level();
      ctx.clearRect(0, 0, W, H);
      if (al <= 0.003) return;
      const D = Math.min(190, W * 0.2), par = -window.scrollY * 0.18;
      const pos = pts.map((p) => {
        if (!still) {
          p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20;
          if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
          if (ptr.on) {   // el cursor aparta suavemente los nodos cercanos (no los atrae: atraerlos los amontonaba si el cursor quedaba quieto)
            const dx = p.x - ptr.x, dy = (p.y + par) - ptr.y, d = Math.hypot(dx, dy);
            if (d < 140 && d > 1) { const f = (1 - d / 140) * 46 * dt; p.x += (dx / d) * f; p.y += (dy / d) * f; }
          }
        }
        let y = (p.y + par) % H; if (y < 0) y += H;
        return { x: p.x, y };
      });
      ctx.lineWidth = 1;
      const edges: [number, number][] = [];
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
        const d = Math.hypot(pos[i].x - pos[j].x, pos[i].y - pos[j].y);
        if (d < D) {
          ctx.strokeStyle = `rgba(65,98,255,${(1 - d / D) * 0.5 * al})`;
          ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(pos[j].x, pos[j].y); ctx.stroke();
          if (d < D * 0.7) edges.push([i, j]);
        }
      }
      if (ptr.on) {
        for (let i = 0; i < pos.length; i++) {
          const d = Math.hypot(pos[i].x - ptr.x, pos[i].y - ptr.y);
          if (d < 190) { ctx.strokeStyle = `rgba(255,222,65,${(1 - d / 190) * 0.55 * al * 1.6})`; ctx.beginPath(); ctx.moveTo(pos[i].x, pos[i].y); ctx.lineTo(ptr.x, ptr.y); ctx.stroke(); }
        }
      }
      for (let i = 0; i < pts.length; i++) {
        ctx.globalAlpha = al * 1.5 > 1 ? 1 : al * 1.5;
        ctx.fillStyle = pts[i].c;
        ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, pts[i].r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Pulsos: un punto amarillo recorre una línea existente.
      if (!still) {
        nextPulse -= dt;
        if (nextPulse <= 0 && edges.length) { const [a, b] = edges[Math.floor(rand() * edges.length)]; pulses.push({ a, b, t: 0 }); nextPulse = 1.4 + rand() * 1.8; }
        for (let k = pulses.length - 1; k >= 0; k--) {
          const pl = pulses[k]; pl.t += dt / 1.3;
          if (pl.t >= 1 || !pos[pl.a] || !pos[pl.b]) { pulses.splice(k, 1); continue; }
          const x = pos[pl.a].x + (pos[pl.b].x - pos[pl.a].x) * pl.t, y = pos[pl.a].y + (pos[pl.b].y - pos[pl.a].y) * pl.t;
          ctx.globalAlpha = Math.min(1, al * 2.2) * Math.sin(pl.t * Math.PI);
          ctx.fillStyle = "#ffde41"; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (document.hidden) { last = t; return; }
      frame++;
      if (small && frame % 2) return;                       // en móvil, a la mitad de cuadros
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      cur += (target - cur) * Math.min(1, dt * 4);
      if (level() <= 0.003) { ctx.clearRect(0, 0, W, H); return; }
      draw(dt);
    };

    const move = (e: PointerEvent) => { if (e.pointerType === "mouse") { ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; } };
    const leave = () => { ptr.on = false; };
    const onScroll = () => measure();
    window.addEventListener("resize", size);
    window.addEventListener("scroll", onScroll, { passive: true });
    size();
    if (reduce) {
      const still = () => { measure(); cur = target; draw(0, true); };
      window.addEventListener("scroll", still, { passive: true });
      return () => { window.removeEventListener("resize", size); window.removeEventListener("scroll", still); window.removeEventListener("scroll", onScroll); };
    }
    window.addEventListener("pointermove", move);
    document.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", size); window.removeEventListener("pointermove", move); document.removeEventListener("pointerleave", leave); };
  }, []);

  return <canvas ref={ref} className="ambient" aria-hidden="true" />;
}
