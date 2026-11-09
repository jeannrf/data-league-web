import { useCallback, useEffect, useRef, useState } from "react";
import Network from "../components/Network";
import Countdown from "../components/Countdown";
import Line from "../components/Line";
import Constellation from "../components/Constellation";
import Crowd, { type CrowdState } from "../components/Crowd";
import AlliesNet from "../components/AlliesNet";
import Ambient from "../components/Ambient";
import { useNavigate, Link } from "react-router";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../lib/auth";
import { FECHA_LIMITE, POSTULACION_ABIERTA, aliados, cronograma, faq, requisitos, tracks } from "../config";

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display ${className}`}>
      <span>Data </span>
      <span className="text-primary">League</span>
    </span>
  );
}

function ApplyButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const goForm = useCallback(() => navigate("/postular"), [navigate]);
  if (!POSTULACION_ABIERTA) return <span className="btn" role="link" aria-disabled="true">Postulaciones abren pronto</span>;
  return (
    <>
      <button type="button" className="btn" onClick={() => (user ? goForm() : setOpen(true))}>Postula</button>
      {open && <AuthModal open onClose={() => setOpen(false)} onSignedIn={goForm} />}
    </>
  );
}

const NAV = [["#tracks", "Tracks"], ["#cronograma", "Cronograma"], ["#requisitos", "Requisitos"], ["#faq", "Preguntas"]] as const;

function Nav() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="wrap flex items-center justify-between py-5">
        <a href="#top" aria-label="Data League, inicio" className="whitespace-nowrap"><Wordmark className="text-2xl" /></a>
        <nav aria-label="Principal" className="hidden gap-5 text-[0.95rem] font-medium md:flex lg:gap-8">
          {NAV.map(([h, t]) => (
            <a key={h} href={h} className="text-soft no-underline transition-colors hover:text-accent">{t}</a>
          ))}
        </nav>
        <button ref={btn} type="button" className="burger md:hidden" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="menu-movil" onClick={() => setOpen((o) => !o)}>
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div id="menu-movil" className="mobile-menu md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <nav aria-label="Menú móvil" className="grid">
            {NAV.map(([h, t]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="display border-b border-line py-5 text-[2.25rem] no-underline">{t}</a>
            ))}
          </nav>
          <div className="mt-10 flex flex-wrap gap-3"><ApplyButton /><Link to="/sponsor" onClick={() => setOpen(false)} className="btn btn-ghost no-underline">Sé sponsor</Link></div>
          <p className="mt-6 text-sm font-bold uppercase tracking-wide text-accent">Cierre: 29 de noviembre, 23:59</p>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section id="top" data-ambient="off" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      <div className="wrap grid flex-1 items-center gap-5 pb-8 pt-24 lg:grid-cols-[1.05fr_0.95fr] xl:grid-cols-[1.15fr_0.85fr] lg:gap-4 lg:pb-8 lg:pt-20">
        <div className="lg:col-start-1 lg:row-start-1">
          <h1 className="display halo intro text-[21vw] leading-[0.84] md:text-[15vw] lg:text-[min(9.4vw,9.5rem)] xl:text-[min(10.4vw,9.5rem)]" style={{ ["--id" as string]: "1000ms" }}>
            <span className="block">Data</span>
            <span className="block text-primary">League</span>
          </h1>
          <p className="display halo intro mt-7 text-[clamp(1.1rem,3vw,1.75rem)] leading-none" style={{ ["--id" as string]: "1350ms" }}>Aprende. Demuestra. Conecta.</p>
          <p className="measure halo intro mt-5 text-xl text-ink md:text-[1.375rem]" style={{ ["--id" as string]: "1550ms" }}>
            La liga de ciencia de datos entre universidades e institutos del Perú. Final presencial en la UNI, el 5 de diciembre.
          </p>
          <div className="intro mt-8 flex flex-wrap items-center gap-3" style={{ ["--id" as string]: "1750ms" }}><ApplyButton /><Link to="/sponsor" className="btn btn-ghost no-underline">Sé sponsor</Link></div>
        </div>
        <Network origin assemble interactive pulses className="map-fade pointer-events-none absolute -right-[10%] top-[10%] -z-10 h-[52%] w-auto md:-right-[3%] md:top-[12%] md:h-[64%] lg:static lg:z-auto lg:col-start-2 lg:row-start-1 lg:h-auto lg:w-[min(100%,calc(min(76svh,780px)*0.7212))] lg:justify-self-center" />
      </div>
      <div id="band" className="relative z-10 border-t border-line">
        <div className="wrap flex flex-col gap-4 py-5 md:py-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div>
            <p className="text-[0.8rem] font-black uppercase tracking-[0.16em] text-muted">Cierre de postulaciones</p>
            <p className="display mt-1 text-[clamp(1.4rem,3.4vw,2rem)] leading-none">29 de noviembre · 23:59</p>
          </div>
          <Countdown />
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section data-sec className="border-t border-line" aria-labelledby="que-es">
      <div className="wrap py-24 md:py-40">
        <h2 id="que-es" data-node className="display h-xl">Una liga que conecta universidades</h2>
        <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-2 md:gap-14">
          <p className="max-w-[34ch] text-[1.5rem] font-bold leading-tight text-ink">Data League reúne a estudiantes de universidades e institutos de todo el país alrededor de un mismo desafío con datos.</p>
          <p className="measure">Aprenden en las jornadas, demuestran lo que saben y se conectan con otras comunidades. Como las grandes ligas universitarias, no pertenece a una sola institución: esta edición se juega en la UNI, en Lima, y en las próximas la sede cambiará.</p>
        </div>
      </div>
    </section>
  );
}

function Tracks() {
  return (
    <section id="tracks" data-sec data-ambient="off" className="border-t border-line" aria-labelledby="h-tracks">
      <div className="wrap py-24 md:py-40">
        <h2 id="h-tracks" data-node className="display h-xl">Elige tu track</h2>
        <p className="measure mt-5 text-xl text-ink">Cada equipo o postulante individual trabaja en un solo eje temático.</p>
        <ol className="mt-14 md:mt-20">
          {tracks.map((t) => (
            <li key={t.id} className="rank-row">
              <span className="num display text-3xl md:text-4xl" aria-hidden="true">{t.id}</span>
              <div>
                <h3 className="display text-[clamp(1.3rem,2.4vw,2rem)] leading-[1]"><span className="sr-only">Track {t.id}: </span>{t.nombre}</h3>
                <p className="t-desc mt-2 max-w-[60ch]">{t.descripcion}</p>
              </div>
              <Constellation id={t.id} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Schedule() {
  const ref = useRef<HTMLOListElement>(null);
  const [lit, setLit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setLit(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setLit(true); io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // El nodo del cierre late más rápido a medida que se acerca el plazo.
  const dias = (FECHA_LIMITE.getTime() - Date.now()) / 86400000;
  const beat = dias > 14 ? 3.2 : dias > 7 ? 2.2 : dias > 3 ? 1.5 : dias > 1 ? 1 : 0.65;
  const label = { virtual: "Virtual", presencial: "Presencial", cierre: "Último día para postular" } as const;
  return (
    <section id="cronograma" data-sec data-ambient="off" className="border-t border-line" aria-labelledby="h-cron">
      <div className="wrap py-24 md:py-40">
        <h2 id="h-cron" data-node className="display h-xl">Del 27 de noviembre al 5 de diciembre</h2>
        <p className="measure mt-5 text-xl text-ink">Cuatro jornadas virtuales y una final presencial.</p>
        <div className="route-wrap relative mt-16 md:mt-24" data-lit={lit}>
        <span className="travel" aria-hidden="true" />
        <ol ref={ref} data-lit={lit} className="route">
          {cronograma.map((j, i) => {
            const big = j.modalidad !== "virtual";
            return (
              <li key={j.fecha} style={{ ["--i" as string]: i }}>
                <span className={`dot ${j.modalidad}`} style={j.modalidad === "cierre" ? { ["--beat" as string]: `${beat}s` } : undefined} aria-hidden="true" />
                <time dateTime={j.fecha} className={`display block text-[2.5rem] md:text-[2.75rem] ${big ? "text-accent" : ""}`}>{j.dia}<span className={`block text-[0.5em] ${big ? "" : "text-primary-text"}`}>{j.mes}</span></time>
                <p className="mt-2 font-bold leading-snug text-ink">{j.tema}</p>
                <p className={`mt-1 text-[0.95rem] ${big ? "font-bold text-accent" : "text-muted"}`}>{label[j.modalidad]}</p>
              </li>
            );
          })}
        </ol>
        </div>
      </div>
    </section>
  );
}

function Requirements() {
  return (
    <section id="requisitos" data-sec className="border-t border-line" aria-labelledby="h-req">
      <div className="wrap py-24 md:py-40">
        <h2 id="h-req" data-node className="display h-xl">Para postular necesitas</h2>
        <ul className="mt-14 md:mt-20">
          {requisitos.map((r) => (
            <li key={r} className="border-t border-line py-6 text-[1.25rem] font-bold leading-tight text-ink last:border-b md:text-[1.5rem]">{r}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Impact() {
  const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [st, setSt] = useState<CrowdState>({ phase: 3, c1: 300, c2: 120, c3: 20 });
  const onState = useCallback((s: CrowdState) => setSt(s), []);
  const num = (live: number, final: string) => (
    <span className="relative inline-block">
      <span className="invisible" aria-hidden="true">{final}</span>
      <span className="absolute inset-0" aria-hidden="true">{reduce ? final : `${live}${final.endsWith("+") ? "+" : ""}`}</span>
    </span>
  );
  return (
    <section data-sec data-stage data-ambient="off" data-phase={st.phase} className="impact relative border-t border-line md:h-[360svh] h-[320svh]" aria-labelledby="h-impacto">
      <span data-node aria-hidden="true" className="absolute left-0 top-28 text-[2rem]" />
      <div className="sticky top-0 flex h-svh flex-col overflow-hidden md:flex-row">
        <div className="relative z-10 flex flex-none flex-col justify-center px-7 pb-2 pt-20 md:w-[46%] md:max-w-[640px] md:py-0 md:pl-14 md:pr-0">
          <h2 id="h-impacto" className="display leading-[0.86]" aria-label="Las metas: 300 o más jóvenes, 120 en la final y 20 o más comunidades">
            <span className="m1 block"><span className="text-[clamp(3rem,10vw,7.5rem)] text-accent">{num(st.c1, "300+")}</span> <span className="text-[clamp(1.1rem,3vw,2.25rem)]">jóvenes</span></span>
            <span className="m2 mt-2 block md:mt-3"><span className="text-[clamp(2.5rem,8vw,5.75rem)]">{num(st.c2, "120")}</span> <span className="text-[clamp(1.1rem,3vw,2.25rem)]">en la final</span></span>
            <span className="m3 mt-2 block md:mt-3"><span className="text-[clamp(2rem,6vw,4.25rem)] text-primary-text">{num(st.c3, "20+")}</span> <span className="text-[clamp(1.1rem,3vw,2.25rem)]">comunidades</span></span>
          </h2>
          <p className="impact-cap mt-4 max-w-[34ch] text-[1.05rem] text-ink md:mt-8 md:text-xl">
            {st.phase <= 1 ? "Queremos reunir a más de 300 jóvenes de todo el país." : st.phase === 2 ? "120 de ellos llegarán a la final presencial en la UNI." : "Y cada comunidad enviará a sus finalistas. Metas de la edición 2026."}
          </p>
        </div>
        <div className="relative min-h-0 flex-1 md:pr-6">
          <Crowd onState={onState} />
        </div>
      </div>
    </section>
  );
}

function Prizes() {
  return (
    <section data-sec className="border-t border-line" aria-labelledby="h-premios">
      <div className="wrap py-24 md:py-36">
        <h2 id="h-premios" data-node className="display h-lg">Premios y jurado</h2>
        <p className="display stroke-text mt-4 text-[clamp(1.9rem,6vw,4.5rem)] leading-[0.9] text-accent">Próximamente</p>
      </div>
    </section>
  );
}

function Allies() {
  const lista = [
    ...aliados.institucionales.map((nombre) => ({ nombre, rol: "Aliado institucional" })),
    ...aliados.comunidades.map((nombre) => ({ nombre, rol: "Community partner" })),
  ];
  return (
    <section data-sec data-ambient="off" className="border-t border-line" aria-labelledby="h-aliados">
      <div className="wrap py-24 md:py-40">
        <h2 id="h-aliados" data-node className="display h-xl">Quienes hacen la liga</h2>
        <AlliesNet aliados={lista} />
      </div>
    </section>
  );
}

function Sponsors() {
  return (
    <section id="sponsors" data-sec className="border-t border-line" aria-labelledby="h-sponsors">
      <div className="wrap grid gap-10 py-24 md:grid-cols-12 md:py-40">
        <h2 id="h-sponsors" data-node className="display h-xl md:col-span-7">Sé sponsor de Data League</h2>
        <div className="md:col-span-5 md:pt-3">
          <p className="measure text-[1.375rem] font-bold leading-tight text-ink">¿Tu empresa u organización quiere apoyar a la próxima generación de talento en datos?</p>
          <p className="measure mt-5">Cuéntanos quién eres y cómo te gustaría participar. El equipo organizador te escribirá para conversarlo.</p>
          <Link to="/sponsor" className="btn mt-8 no-underline">Postular como sponsor</Link>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" data-sec className="border-t border-line" aria-labelledby="h-faq">
      <div className="wrap py-24 md:py-40">
        <h2 id="h-faq" data-node className="display h-xl">Preguntas frecuentes</h2>
        <div className="mt-14 md:mt-20">
          {faq.map((f) => (
            <details key={f.p} className="faq border-b border-line first:border-t">
              <summary><span className="text-xl font-bold text-ink transition-colors">{f.p}</span></summary>
              <p className="measure pb-7 text-soft">{f.r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const links = [["#tracks", "Tracks"], ["#cronograma", "Cronograma"], ["#requisitos", "Requisitos"], ["#sponsors", "Sponsors"], ["#faq", "Preguntas frecuentes"]];
  return (
    <footer data-sec data-end className="border-t border-line">
      <div className="wrap grid gap-14 pt-20 lg:grid-cols-12 md:pt-28">
        <div className="lg:col-span-7">
          <p className="display text-[min(15vw,8.5rem)] leading-[0.86] lg:text-[min(9vw,8.5rem)]" data-node>
            <span className="block">Data</span>
            <span className="block text-primary">League</span>
          </p>
          <p className="display mt-6 text-[clamp(1.1rem,3vw,1.6rem)] leading-none">Aprende. Demuestra. Conecta.</p>
        </div>
        <div className="grid content-between gap-12 lg:col-span-5">
          <nav aria-label="Pie de página">
            <ul className="space-y-1">
              {links.map(([h, t]) => (
                <li key={h}>
                  <a href={h} className="display block border-b border-line py-3 text-[clamp(1.4rem,2.4vw,2rem)] no-underline transition-colors hover:text-accent">{t}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="mb-4 font-bold text-ink">Cierre de postulaciones: 29 de noviembre, 23:59</p>
            <ApplyButton />
          </div>
        </div>
      </div>
      <div className="wrap mt-20 md:mt-28">
        <div className="flex flex-col gap-3 border-t border-line py-8 text-[0.95rem] text-soft md:flex-row md:items-center md:justify-between">
          <p>Data League 2026 · Universidad Nacional de Ingeniería, Lima</p>
          <p>Contacto y redes: próximamente · Política de privacidad y bases: próximamente</p>
          <a href="#top" className="whitespace-nowrap font-black uppercase tracking-wide text-accent no-underline hover:underline">Volver arriba ↑</a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div id="stage">
      <Ambient />
      <Line />
      <a href="#que-es" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-bg">Saltar al contenido</a>
      <Nav />
      <main>
        <Hero />
        <About />
        <Tracks />
        <Schedule />
        <Requirements />
        <Impact />
        <Prizes />
        <Allies />
        <Sponsors />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
