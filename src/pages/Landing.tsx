import { useCallback, useEffect, useRef, useState } from "react";
import Network from "../components/Network";
import Countdown from "../components/Countdown";
import Line from "../components/Line";
import Constellation from "../components/Constellation";
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

/** «Iniciar sesión» abre la ventana de Google; con sesión iniciada se vuelve «Mi cuenta». */
function AccountButton({ onNavigate, block }: { onNavigate?: () => void; block?: boolean }) {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  if (loading) return null;
  const cls = `btn btn-ghost btn-sm no-underline${block ? " w-full" : ""}`;
  if (user) return <Link to="/cuenta" onClick={onNavigate} className={cls}>Mi cuenta</Link>;
  return (
    <>
      <button type="button" className={cls} onClick={() => setOpen(true)}>Iniciar sesión</button>
      {open && <AuthModal open onClose={() => setOpen(false)} onSignedIn={() => { setOpen(false); onNavigate?.(); }} title="Inicia sesión" text="Usa tu cuenta de Google para postular, inscribirte a las jornadas y ver tu cuenta." />}
    </>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <header className={`site-nav fixed inset-x-0 top-0 z-30 ${solid || open ? "is-solid" : ""}`}>
      <div className="wrap flex items-center justify-between py-4">
        <a href="#top" aria-label="Data League, inicio" className="whitespace-nowrap"><Wordmark className="text-2xl" /></a>
        <nav aria-label="Principal" className="hidden items-center gap-7 text-[0.95rem] font-medium lg:flex">
          {NAV.map(([h, t]) => (
            <a key={h} href={h} className="text-soft no-underline transition-colors hover:text-accent">{t}</a>
          ))}
          <Link to="/eventos" className="text-soft no-underline transition-colors hover:text-accent">Eventos</Link>
          <AccountButton />
        </nav>
        <button ref={btn} type="button" className="burger lg:hidden" aria-label={open ? "Cerrar menú" : "Abrir menú"} aria-expanded={open} aria-controls="menu-movil" onClick={() => setOpen((o) => !o)}>
          <span /><span /><span />
        </button>
      </div>
      {open && (
        <div id="menu-movil" className="mobile-menu lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <nav aria-label="Menú móvil" className="grid">
            {NAV.map(([h, t]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="display border-b border-line py-5 text-[2.25rem] no-underline">{t}</a>
            ))}
            <Link to="/eventos" onClick={() => setOpen(false)} className="display border-b border-line py-5 text-[2.25rem] no-underline">Eventos</Link>
          </nav>
          <div className="mt-10"><AccountButton onNavigate={() => setOpen(false)} block /></div>
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
          <div className="intro mt-8 flex flex-wrap items-center gap-3" style={{ ["--id" as string]: "1750ms" }}><div className="hero-apply order-last w-full sm:order-none sm:w-auto"><ApplyButton /></div><Link to="/mentor" className="btn btn-ghost hero-sec no-underline">Sé mentor</Link><Link to="/sponsor" className="btn btn-ghost hero-sec no-underline">Sé sponsor</Link></div>
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
        <h2 id="que-es" data-node className="title h-xl">Una liga que conecta universidades</h2>
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
        <h2 id="h-tracks" data-node className="title h-xl">Elige tu track</h2>
        <p className="measure mt-5 text-xl text-ink">Cada equipo o postulante individual trabaja en un solo eje temático.</p>
        <ol className="mt-14 md:mt-20">
          {tracks.map((t) => (
            <li key={t.id} className="rank-row">
              <span className="num display text-3xl md:text-4xl" aria-hidden="true">{t.id}</span>
              <div>
                <h3 className="title text-[clamp(1.3rem,2.4vw,2rem)] leading-[1]"><span className="sr-only">Track {t.id}: </span>{t.nombre}</h3>
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
        <h2 id="h-cron" data-node className="title h-xl">Del 27 de noviembre al 5 de diciembre</h2>
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
        <Link to="/eventos" className="btn btn-ghost mt-12 no-underline">Inscribirme a las jornadas virtuales</Link>
      </div>
    </section>
  );
}

function Requirements() {
  return (
    <section id="requisitos" data-sec className="border-t border-line" aria-labelledby="h-req">
      <div className="wrap py-24 md:py-40">
        <h2 id="h-req" data-node className="title h-xl">Para postular necesitas</h2>
        <ul className="mt-14 md:mt-20">
          {requisitos.map((r) => (
            <li key={r} className="border-t border-line py-6 text-[1.25rem] font-bold leading-tight text-ink last:border-b md:text-[1.5rem]">{r}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Cifra que sube de 0 a su meta la primera vez que entra en pantalla. Sin movimiento, muestra la cifra final. */
function CountUp({ to, suffix = "", delay = 0 }: { to: number; suffix?: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(() => (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? to : 0));
  useEffect(() => {
    const el = ref.current;
    if (!el || v === to) return;
    let raf = 0, timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      timer = window.setTimeout(() => {
        const t0 = performance.now(), dur = 1400;
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / dur);
          setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }, delay);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [to, delay]);   // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={ref} className="relative inline-block tabular-nums" aria-hidden="true">
      <span className="invisible">{to}{suffix}</span>
      <span className="absolute inset-0 text-center">{v}{suffix}</span>
    </span>
  );
}

function Impact() {
  const metas = [
    { n: 300, suf: "+", t: "jóvenes", color: "text-accent" },
    { n: 120, suf: "", t: "en la final", color: "text-ink" },
    { n: 20, suf: "+", t: "comunidades", color: "text-primary-text" },
  ];
  return (
    <section data-sec data-ambient="off" className="relative border-t border-line" aria-labelledby="h-impacto">
      <span data-node aria-hidden="true" className="absolute left-0 top-28 text-[2rem]" />
      <div className="wrap py-24 text-center md:py-40">
        <h2 id="h-impacto" className="text-[0.8rem] font-black uppercase tracking-[0.16em] text-muted" aria-label="Las metas de la edición 2026: 300 o más jóvenes, 120 en la final y 20 o más comunidades">Las metas de la edición 2026</h2>
        <ul className="mt-10 grid gap-10 md:mt-16 md:grid-cols-3 md:gap-0">
          {metas.map((m, i) => (
            <li key={m.t} className={`flex flex-col items-center ${i > 0 ? "md:border-l md:border-line" : ""}`}>
              <span className={`display leading-[0.9] text-[clamp(4.5rem,22vw,6.5rem)] md:text-[clamp(4rem,9vw,9rem)] ${m.color}`}><CountUp to={m.n} suffix={m.suf} delay={i * 250} /></span>
              <span className="display mt-3 text-[clamp(1.1rem,3vw,2rem)]">{m.t}</span>
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-12 max-w-[34ch] text-[1.05rem] text-ink md:mt-20 md:text-xl">120 de ellos llegarán a la final presencial en la UNI. Cada comunidad enviará a sus finalistas.</p>
      </div>
    </section>
  );
}

function Prizes() {
  return (
    <section data-sec className="border-t border-line" aria-labelledby="h-premios">
      <div className="wrap py-24 md:py-36">
        <h2 id="h-premios" data-node className="title h-lg">Premios y jurado</h2>
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
        <h2 id="h-aliados" data-node className="title h-xl">Quienes hacen la liga</h2>
        <AlliesNet aliados={lista} />
      </div>
    </section>
  );
}

function Mentors() {
  return (
    <section id="mentores" data-sec className="border-t border-line" aria-labelledby="h-mentores">
      <div className="wrap grid gap-10 py-24 md:grid-cols-12 md:py-40">
        <h2 id="h-mentores" data-node className="title h-xl md:col-span-7">Sé mentor de Data League</h2>
        <div className="md:col-span-5 md:pt-3">
          <p className="measure text-[1.375rem] font-bold leading-tight text-ink">¿Trabajas o investigas con datos? Acompaña a los equipos mientras desarrollan su desafío.</p>
          <p className="measure mt-5">Cuéntanos en qué áreas puedes guiar a estudiantes de todo el Perú. El equipo organizador te escribirá para conversarlo.</p>
          <Link to="/mentor" className="btn mt-8 no-underline">Postular como mentor</Link>
        </div>
      </div>
    </section>
  );
}

function Sponsors() {
  return (
    <section id="sponsors" data-sec className="border-t border-line" aria-labelledby="h-sponsors">
      <div className="wrap grid gap-10 py-24 md:grid-cols-12 md:py-40">
        <h2 id="h-sponsors" data-node className="title h-xl md:col-span-7">Sé sponsor de Data League</h2>
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
        <h2 id="h-faq" data-node className="title h-xl">Preguntas frecuentes</h2>
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
  return (
    <footer data-sec data-end data-ambient="off" className="site-footer">
      <div className="wrap grid gap-10 py-14 md:grid-cols-12 md:py-16">
        <div className="md:col-span-6">
          <Wordmark className="text-3xl" />
          <p className="mt-3 text-[1.05rem] text-soft">Aprende. Demuestra. Conecta.</p>
          <p className="mt-6 max-w-[42ch] text-[0.95rem] text-soft">La liga de ciencia de datos entre universidades e institutos del Perú. Edición 2026 en la Universidad Nacional de Ingeniería, Lima.</p>
        </div>
        <nav aria-label="Pie de página" className="md:col-span-3">
          <p className="foot-h">Explora</p>
          <ul className="mt-3 text-[0.95rem]">
            {NAV.map(([h, t]) => <li key={h}><a href={h} className="inline-block py-2 text-soft no-underline hover:text-accent">{t}</a></li>)}
            <li><Link to="/eventos" className="inline-block py-2 text-soft no-underline hover:text-accent">Eventos</Link></li>
          </ul>
        </nav>
        <div className="md:col-span-3">
          <p className="foot-h">Participa</p>
          <ul className="mt-3 text-[0.95rem]">
            <li><Link to="/postular" className="inline-block py-2 text-soft no-underline hover:text-accent">Postula tu equipo</Link></li>
            <li><Link to="/mentor" className="inline-block py-2 text-soft no-underline hover:text-accent">Sé mentor</Link></li>
            <li><Link to="/sponsor" className="inline-block py-2 text-soft no-underline hover:text-accent">Sé sponsor</Link></li>
          </ul>
          <p className="mt-6 text-[0.9rem] text-soft">Cierre: 29 de noviembre, 23:59</p>
        </div>
      </div>
      <div className="foot-bar">
        <div className="wrap flex flex-col gap-2 py-5 text-[0.85rem] text-soft md:flex-row md:items-center md:justify-between">
          <p>© 2026 Data League · Contacto y redes: próximamente · Política de privacidad y bases: próximamente</p>
          <a href="#top" className="whitespace-nowrap font-black uppercase tracking-[0.12em] text-accent no-underline hover:underline">Volver arriba ↑</a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div id="stage" className="reading">
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
        <Mentors />
        <Sponsors />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
