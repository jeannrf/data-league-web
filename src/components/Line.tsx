import { useEffect, useRef } from "react";

type Pt = [number, number];
type NodeSpec = { x: number; y: number; r: number; end?: boolean };

/**
 * La línea continua del geoglifo: baja por los márgenes en zigzag, cruza en cada
 * borde de sección y enciende un nodo en cada título. Se dibuja con el scroll.
 */
export default function Line() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const stage = document.getElementById("stage");
    const svg = svgRef.current;
    if (!stage || !svg) return;
    const NS = "http://www.w3.org/2000/svg";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let pts: Pt[] = [];
    let cum: number[] = [];
    let keys: number[] = [];
    let total = 0;
    let nodes: { el: SVGCircleElement; y: number; kind: string }[] = [];
    let pathB: SVGPathElement | null = null;
    let head: SVGCircleElement | null = null;
    let top = 0;

    const build = () => {
      const sr = stage.getBoundingClientRect();
      top = sr.top + window.scrollY;
      const W = stage.clientWidth;
      const H = stage.scrollHeight;
      const rel = (r: DOMRect) => ({ cx: r.left + r.width / 2 - sr.left, cy: r.top + r.height / 2 - sr.top, top: r.top - sr.top, bottom: r.bottom - sr.top });
      const g = W >= 768 ? 24 : 10;
      const xL = g, xR = W - g;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      svg.innerHTML = "";

      const band = document.getElementById("band");
      if (!band) return;
      const b = rel(band.getBoundingClientRect());
      const start: Pt = [xL, b.top];

      // El tramo del hero (de Lima hacia abajo) se retiró: el recorrido empieza en el margen, al borde de la barra del cierre.

      // Tramo principal: zigzag de margen a margen.
      const secs = [...stage.querySelectorAll<HTMLElement>("[data-sec]")];
      const specs: NodeSpec[] = [];
      const hops: { x: number; y: number; key: number }[] = [];
      pts = [start];
      let side: "L" | "R" = "L";
      const bevel = 14;
      secs.forEach((sec, i) => {
        const sb = rel(sec.getBoundingClientRect());
        const head = sec.querySelector<HTMLElement>("[data-node]");
        const x = side === "L" ? xL : xR;
        if (head) {
          const hr = head.getBoundingClientRect();
          const fs = parseFloat(getComputedStyle(head).fontSize);
          const y = hr.top - sr.top + fs * 0.5;
          specs.push({ x, y, r: sec.hasAttribute("data-end") ? 11 : 7, end: sec.hasAttribute("data-end") });
          pts.push([x, y]);
        }
        if (i < secs.length - 1) {
          const yc = sb.bottom;
          const nx = side === "L" ? xR : xL;
          const dir = side === "L" ? 1 : -1;
          // Cruce de un margen al otro con un salto en arco, como un cable que pasa por encima.
          const mid = (x + nx) / 2, hopW = Math.min(46, Math.abs(nx - x) / 4), hopH = 24;
          pts.push([x, yc - bevel], [x + dir * bevel, yc], [mid - dir * hopW, yc]);
          for (let k = 1; k <= 18; k++) {
            const th = Math.PI - (k / 18) * Math.PI;           // de π a 0
            pts.push([mid + dir * hopW * Math.cos(th), yc - hopH * Math.sin(th)]);
          }
          hops.push({ x: mid, y: yc - hopH, key: pts.length });
          pts.push([nx - dir * bevel, yc], [nx, yc + bevel]);
          side = side === "L" ? "R" : "L";
        }
      });

      cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      total = cum[cum.length - 1];
      keys = [];
      pts.forEach((p, i) => keys.push(i === 0 ? p[1] : Math.max(keys[i - 1], p[1])));

      pathB = document.createElementNS(NS, "path");
      pathB.setAttribute("d", "M" + pts.map((p) => p.join(",")).join(" L"));
      pathB.setAttribute("class", "furrow");
      pathB.setAttribute("stroke-dasharray", String(total));
      pathB.setAttribute("stroke-dashoffset", String(reduce ? 0 : total));
      svg.appendChild(pathB);

      hops.forEach((hp) => specs.push({ x: hp.x, y: hp.y, r: 4.5 }));
      nodes = specs.map((s) => {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", String(s.x));
        c.setAttribute("cy", String(s.y));
        c.setAttribute("r", String(s.r));
        c.setAttribute("class", `lnode${s.end ? " end" : ""}`);
        if (reduce) c.setAttribute("data-on", "true");
        svg.appendChild(c);
        return { el: c, y: s.y, kind: s.end ? "end" : "n" };
      });
      head = document.createElementNS(NS, "circle");
      head.setAttribute("r", "6");
      head.setAttribute("class", "lhead");
      head.style.display = "none";
      svg.appendChild(head);
      update();
    };

    const pointAt = (len: number): Pt => {
      for (let i = 1; i < pts.length; i++) {
        if (len <= cum[i]) {
          const t = (len - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
          return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
        }
      }
      return pts[pts.length - 1];
    };

    const lenAt = (y: number) => {
      if (y <= keys[0]) return 0;
      for (let i = 1; i < pts.length; i++) {
        if (y < keys[i]) {
          const span = keys[i] - keys[i - 1];
          if (span <= 0) return cum[i - 1];
          return cum[i - 1] + (cum[i] - cum[i - 1]) * ((y - keys[i - 1]) / span);
        }
      }
      return total;
    };

    const update = () => {
      if (!pathB || reduce) return;
      const y = window.scrollY + window.innerHeight * 0.72 - top;
      const L = lenAt(y);
      pathB.setAttribute("stroke-dashoffset", String(Math.max(0, total - L)));
      if (head) {
        if (L > 1 && L < total - 1) {
          const [hx, hy] = pointAt(L);
          head.setAttribute("cx", String(hx));
          head.setAttribute("cy", String(hy));
          head.style.display = "";
        } else head.style.display = "none";
      }
      nodes.forEach((n) => n.el.setAttribute("data-on", n.y <= y ? "true" : "false"));
    };

    let raf = 0;
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    const ro = new ResizeObserver(() => build());
    ro.observe(stage);
    const hero = document.getElementById("top");
    if (hero) ro.observe(hero);
    const originEl = stage.querySelector("[data-origin]");
    if (originEl) ro.observe(originEl);
    window.addEventListener("resize", build);
    window.addEventListener("load", build);
    document.fonts?.ready.then(build);
    window.addEventListener("scroll", onScroll, { passive: true });
    build();
    return () => { ro.disconnect(); window.removeEventListener("resize", build); window.removeEventListener("load", build); window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return <svg ref={svgRef} className="line-svg" aria-hidden="true" />;
}
