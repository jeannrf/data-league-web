import "./tipografias.css";

/** Página de comparación de tipografías (temporal, no enlazada). */
const OPCIONES = [
  { id: "A", nombre: "Archivo extendida (la actual)", familia: '"Archivo Variable", Arial, sans-serif', css: { fontWeight: 900, fontStretch: "116%" }, nota: "Grotesca ancha y pesada. Muy usada en webs de tecnología." },
  { id: "B", nombre: "Graduate", familia: '"Graduate", serif', css: { fontWeight: 400 }, nota: "Letra de camiseta universitaria: el mundo de las «ligas», las facultades y los torneos." },
  { id: "C", nombre: "Bricolage Grotesque (condensada)", familia: '"Bricolage Grotesque Variable", sans-serif', css: { fontWeight: 800, fontStretch: "75%" }, nota: "Grotesca con rasgos propios, un poco rara y cálida; condensada se siente deportiva." },
  { id: "D", nombre: "Anybody (muy ancha)", familia: '"Anybody Variable", sans-serif', css: { fontWeight: 800, fontStretch: "140%" }, nota: "Variable con anchos extremos: futurista y de cartel deportivo." },
  { id: "E", nombre: "Big Shoulders Display", familia: '"Big Shoulders Display", sans-serif', css: { fontWeight: 900 }, nota: "Condensada atlética, de marcador de estadio. La del primer diseño." },
  { id: "F", nombre: "Alfa Slab One", familia: '"Alfa Slab One", serif', css: { fontWeight: 400 }, nota: "Slab muy pesada: cartel, trofeo, imprenta. Mucha personalidad." },
  { id: "G", nombre: "Gloock (serif de contraste)", familia: '"Gloock", serif', css: { fontWeight: 400 }, nota: "Serif editorial de alto contraste: serio y distinto a lo habitual en datos." },
] as const;

const SANS = '"Figtree Variable", "Hind", Arial, sans-serif';
const SERIF = '"PT Serif", Georgia, serif';

/** Estilos inspirados en ivyleague.com: Effra (Adobe, de pago) en mayúsculas con espaciado, y PT Serif (Google) para titulares y texto. */
function Ivy() {
  const lbl = { fontFamily: SANS, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" } as React.CSSProperties;
  return (
    <>
      <section className="bg-bg py-10">
        <p className="text-sm font-bold tracking-[0.14em] text-muted">H · Estilo Ivy League 1 — sans humanista en mayúsculas con espaciado (aprox. de Effra) para marca y menús, PT Serif para títulos</p>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-ink" style={{ ...lbl, fontSize: "0.9rem" }}>
          <span>Tracks</span><span>Cronograma</span><span>Requisitos</span><span>Preguntas</span><span className="text-accent">Postula</span>
        </div>
        <p className="mt-6 text-ink" style={{ fontFamily: SANS, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "clamp(3.2rem, 10.5vw, 8rem)", lineHeight: 0.95 }}>
          Data <span className="text-primary">League</span>
        </p>
        <p className="mt-4 text-ink" style={{ ...lbl, fontSize: "clamp(1rem, 2.4vw, 1.4rem)", letterSpacing: "0.2em" }}>Aprende. Demuestra. Conecta.</p>
        <p className="mt-8 text-ink" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2rem, 5.5vw, 3.6rem)", lineHeight: 1.05 }}>Elige tu track</p>
        <p className="mt-3 text-soft" style={{ fontFamily: SERIF, fontSize: "1.2rem", lineHeight: 1.55, maxWidth: "52ch" }}>La liga de ciencia de datos entre universidades e institutos del Perú. Final presencial en la UNI, el 5 de diciembre.</p>
        <p className="mt-5 text-accent" style={{ ...lbl, fontSize: "1.1rem" }}>21 días · 02 horas · 28 nov</p>
      </section>

      <section className="bg-bg py-10">
        <p className="text-sm font-bold tracking-[0.14em] text-muted">I · Estilo Ivy League 2 — todo en PT Serif Bold, con etiquetas en sans de mayúsculas pequeñas</p>
        <p className="mt-6 text-ink" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(3.2rem, 11vw, 8.5rem)", lineHeight: 0.98, letterSpacing: "-0.01em" }}>
          Data <span className="text-primary">League</span>
        </p>
        <p className="mt-4 text-ink" style={{ ...lbl, fontSize: "clamp(0.9rem, 2.2vw, 1.2rem)", letterSpacing: "0.22em" }}>Aprende · Demuestra · Conecta</p>
        <p className="mt-8 text-ink" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2rem, 5.5vw, 3.6rem)", lineHeight: 1.05 }}>Elige tu track</p>
        <p className="mt-3 text-soft" style={{ fontFamily: SERIF, fontSize: "1.2rem", lineHeight: 1.55, maxWidth: "52ch" }}>Cada equipo o postulante individual trabaja en un solo eje temático.</p>
        <p className="mt-5 text-accent" style={{ ...lbl, fontSize: "1rem" }}>Cierre de postulaciones · 29 de noviembre</p>
      </section>

      <section className="bg-bg py-10">
        <p className="text-sm font-bold tracking-[0.14em] text-muted">J · Mezcla — marca en sans extra-negrita en mayúsculas, titulares en PT Serif cursiva-negrita y datos en sans</p>
        <p className="mt-6 text-ink" style={{ fontFamily: SANS, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", fontSize: "clamp(3.4rem, 12vw, 9rem)", lineHeight: 0.9 }}>
          Data <span className="text-primary">League</span>
        </p>
        <p className="mt-4 text-ink" style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 400, fontSize: "clamp(1.3rem, 3.4vw, 2.2rem)" }}>Aprende. Demuestra. Conecta.</p>
        <p className="mt-8 text-ink" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2rem, 5.5vw, 3.6rem)", lineHeight: 1.05 }}>Elige tu track</p>
        <p className="mt-5 text-accent" style={{ fontFamily: SANS, fontWeight: 800, fontSize: "clamp(2rem, 6vw, 3.6rem)", fontVariantNumeric: "tabular-nums" }}>21 · 02 · 28</p>
      </section>
    </>
  );
}

export default function Tipografias() {
  return (
    <div className="min-h-svh bg-bg px-5 py-10 md:px-14">
      <meta name="robots" content="noindex" />
      <h1 className="title h-lg">Tipografías</h1>
      <p className="measure mt-3 text-soft">Compara cómo se ve «DATA LEAGUE» y un título con cada letra. Dime la letra de la opción que te guste.</p>
      <div className="mt-10 grid gap-px bg-line">
        {OPCIONES.map((o) => (
          <section key={o.id} className="bg-bg py-10" style={{ fontFamily: o.familia, ...o.css } as React.CSSProperties}>
            <p className="text-sm font-bold tracking-[0.14em] text-muted" style={{ fontFamily: "Archivo Variable, Arial, sans-serif", fontWeight: 700, fontStretch: "100%" }}>{o.id} · {o.nombre} — {o.nota}</p>
            <p className="mt-4 uppercase leading-[0.9] tracking-[-0.01em]" style={{ fontSize: "clamp(3.5rem, 12vw, 9rem)" }}>
              <span className="text-ink">Data </span><span className="text-primary">League</span>
            </p>
            <p className="mt-4 uppercase text-ink" style={{ fontSize: "clamp(1.1rem, 3vw, 1.8rem)" }}>Aprende. Demuestra. Conecta.</p>
            <p className="mt-8 uppercase leading-[1] text-ink" style={{ fontSize: "clamp(2rem, 6vw, 3.75rem)" }}>Elige tu track</p>
            <p className="mt-2 uppercase text-accent" style={{ fontSize: "clamp(1.4rem, 4vw, 2.4rem)" }}>21 días · 02 horas · 28 nov</p>
          </section>
        ))}
        <Ivy />
      </div>
    </div>
  );
}
