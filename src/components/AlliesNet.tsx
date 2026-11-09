import { useEffect, useRef } from "react";

type Ally = { nombre: string; rol: string };

/**
 * Aliados como red: Data League al centro y un nodo por aliado, unidos por líneas en ángulo recto.
 * Al pasar el cursor (o enfocar) sobre un aliado, su línea se enciende y fluye hacia él.
 */
export default function AlliesNet({ aliados }: { aliados: Ally[] }) {
  const box = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const b = box.current, s = svg.current;
    if (!b || !s) return;
    const NS = "http://www.w3.org/2000/svg";
    const build = () => {
      const br = b.getBoundingClientRect();
      s.setAttribute("viewBox", `0 0 ${br.width} ${br.height}`);
      s.innerHTML = "";
      const hub = b.querySelector<HTMLElement>("[data-hub]");
      const dots = [...b.querySelectorAll<HTMLElement>("[data-dot]")];
      if (!hub) return;
      const c = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2 - br.left, y: r.top + r.height / 2 - br.top }; };
      const h = c(hub);
      const wide = dots.length > 1 && Math.abs(c(dots[0]).y - c(dots[dots.length - 1]).y) < 8;
      dots.forEach((d, i) => {
        const p = c(d);
        const path = document.createElementNS(NS, "path");
        // En escritorio los aliados van en fila: baja del centro, recorre y vuelve a bajar. En móvil forman una columna.
        const midY = h.y + (p.y - h.y) / 2;
        path.setAttribute("d", wide ? `M${h.x},${h.y} V${midY} H${p.x} V${p.y}` : `M${h.x},${h.y} V${p.y}`);
        path.setAttribute("class", "ally-line");
        path.setAttribute("data-i", String(i));
        s.appendChild(path);
      });
    };
    build();
    const ro = new ResizeObserver(build);
    ro.observe(b);
    document.fonts?.ready.then(build);
    return () => ro.disconnect();
  }, [aliados]);

  const hot = (i: number, on: boolean) => svg.current?.querySelector(`[data-i="${i}"]`)?.classList.toggle("hot", on);

  return (
    <div ref={box} className="allies relative mt-14">
      <svg ref={svg} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="relative z-10 flex items-center gap-3 md:justify-center">
        <span data-hub className="allies-hub" aria-hidden="true" />
        <span className="display text-2xl"><span>Data </span><span className="text-primary">League</span></span>
      </div>
      <ul className="relative z-10 mt-14 grid gap-10 md:mt-24 md:grid-cols-4 md:gap-8">
        {aliados.map((a, i) => (
          <li key={a.nombre} tabIndex={0} className="ally flex gap-4 md:block"
            onPointerEnter={() => hot(i, true)} onPointerLeave={() => hot(i, false)} onFocus={() => hot(i, true)} onBlur={() => hot(i, false)}>
            <span data-dot className="ally-dot" aria-hidden="true" />
            <div className="md:mt-5">
              <p className="text-[1.25rem] font-bold leading-tight text-ink">{a.nombre}</p>
              <p className="mt-1 text-[0.95rem] font-bold uppercase tracking-wide text-primary-text">{a.rol}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
