import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import Shell from "../components/Shell";
import AuthModal from "../components/AuthModal";
import Flyer from "../components/Flyer";
import { useAuth } from "../lib/auth";
import { eventos, type Jornada } from "../config";
import { cancelarInscripcion, descargarIcs, inscribirse, useMisInscripciones, yaPaso } from "../lib/eventos";

/** Ventana con la información de una jornada: flyer a un lado, datos al otro y la acción siempre a la vista. */
function InfoEvento({ e, inscrito, paso, onClose, onInscribir }: { e: Jornada & { id: string }; inscrito: boolean; paso: boolean; onClose: () => void; onInscribir: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const fl = new Date(`${e.fecha}T12:00:00-05:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fechaLarga = fl.charAt(0).toUpperCase() + fl.slice(1);
  const pasos = ["Inscríbete con tu cuenta de Google.", "Aquí verás el enlace y la hora cuando estén confirmados.", "Añade la jornada a tu calendario."];
  return (
    <dialog ref={ref} className="auth-modal info-modal" aria-labelledby="info-t" onClose={onClose} onClick={(ev) => { if (ev.target === ref.current) onClose(); }}>
      <div className="info-box">
        <button type="button" className="auth-x" aria-label="Cerrar" onClick={onClose}>×</button>
        <div className="info-body">
          <Flyer e={e} />
          <div className="info-main">
            <p className="text-[0.8rem] font-black uppercase tracking-[0.16em] text-primary-text">Jornada virtual</p>
            <h2 id="info-t" className="title mt-2 pr-10 text-[clamp(1.6rem,4.6vw,2.4rem)] leading-[1]">{e.tema}</h2>

            <dl className="info-facts">
              <div><dt>Fecha</dt><dd>{fechaLarga}</dd></div>
              <div><dt>Hora</dt><dd>Por confirmar</dd></div>
              <div><dt>Dónde</dt><dd>En línea{e.enlace && inscrito ? <> · <a href={e.enlace} target="_blank" rel="noreferrer">Entrar</a></> : null}</dd></div>
            </dl>

            {e.descripcion && <section className="mt-6"><h3 className="info-h">Sobre el tema</h3><p className="mt-2 text-soft">{e.descripcion}</p></section>}

            <section className="mt-6">
              <h3 className="info-h">Cómo participar</h3>
              <ol className="info-steps">{pasos.map((t) => <li key={t}>{t}</li>)}</ol>
            </section>
          </div>
        </div>
        <footer className="info-actions">
          {paso ? <span className="text-muted">Esta jornada ya pasó.</span>
            : inscrito ? <><span className="font-bold text-accent" role="status">✓ Estás inscrito</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => descargarIcs(e)}>Añadir al calendario</button></>
              : <button type="button" className="btn" onClick={onInscribir}>Inscribirme</button>}
        </footer>
      </div>
    </dialog>
  );
}

export default function Eventos() {
  const { user } = useAuth();
  const { ids } = useMisInscripciones(user?.uid);
  const [pendiente, setPendiente] = useState<string | null>(null);   // evento que se quería reservar antes de iniciar sesión
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reservar = useCallback(async (id: string) => {
    if (!user) { setPendiente(id); return; }
    setBusy(id); setError("");
    try { await inscribirse(user, id); } catch (e) {
      console.error("inscripción:", e);
      setError((e as { code?: string }).code === "permission-denied"
        ? "No pudimos guardar tu inscripción: la base de datos todavía no permite inscripciones (falta publicar las reglas de seguridad). Avisa al equipo organizador."
        : "No pudimos guardar tu inscripción. Revisa tu conexión e inténtalo de nuevo.");
    }
    setBusy(null);
  }, [user]);

  async function quitar(id: string) {
    if (!user) return;
    if (!window.confirm("¿Cancelar tu inscripción a esta jornada?")) return;
    setBusy(id); setError("");
    try { await cancelarInscripcion(user, id); } catch { setError("No pudimos cancelar tu inscripción. Inténtalo de nuevo."); }
    setBusy(null);
  }

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        <h1 className="title h-xl">Jornadas virtuales</h1>
        <p className="measure mt-6 text-xl text-ink">Inscríbete a las jornadas de Data League con tu cuenta de Google. Te mostraremos aquí el enlace de cada transmisión cuando esté listo.</p>
        {error && <p className="err mt-6" role="alert">{error}</p>}

        <ol className="mt-12 md:mt-16">
          {eventos.map((e) => {
            const inscrito = ids.has(e.id);
            const paso = yaPaso(e);
            return (
              <li key={e.id} className="evento">
                <time dateTime={e.fecha} className="display evento-fecha">{e.dia}<span>{e.mes}</span></time>
                <div>
                  <h2 className="title text-[clamp(1.5rem,3.2vw,2.5rem)] leading-[1]">{e.tema}</h2>
                  <p className="mt-2 text-soft">Virtual · Hora por confirmar</p>
                  {inscrito && (
                    <p className="mt-3 font-bold text-accent" role="status">
                      ✓ Estás inscrito.{" "}
                      {e.enlace ? <a href={e.enlace} className="text-ink" target="_blank" rel="noreferrer">Entrar a la transmisión</a> : <span className="font-normal text-soft">Aquí aparecerá el enlace de la transmisión cuando esté listo.</span>}
                    </p>
                  )}
                </div>
                <div className="evento-acc">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInfo(e.id)}>Ver info</button>
                  {paso ? <span className="text-muted">Ya pasó</span>
                    : inscrito ? (<>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => descargarIcs(e)}>Añadir al calendario</button>
                        <button type="button" className="link-btn" disabled={busy === e.id} onClick={() => void quitar(e.id)}>Cancelar inscripción</button>
                      </>)
                      : <button type="button" className="btn" disabled={busy === e.id} onClick={() => void reservar(e.id)}>{busy === e.id ? "Guardando…" : "Inscribirme"}</button>}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-10 text-soft">La final presencial es el 5 de diciembre en la UNI y se anuncia aparte. ¿Quieres competir? <Link to="/">Mira cómo postular</Link>.</p>
      </div>
      {info && (() => { const e = eventos.find((x) => x.id === info); return e ? (
        <InfoEvento e={e} inscrito={ids.has(e.id)} paso={yaPaso(e)} onClose={() => setInfo(null)} onInscribir={() => { setInfo(null); void reservar(e.id); }} />
      ) : null; })()}
      {pendiente && (
        <AuthModal open title="Inicia sesión para inscribirte" text="Usa tu cuenta de Google. Solo guardamos tu nombre y tu correo."
          onClose={() => setPendiente(null)}
          onSignedIn={() => { const id = pendiente; setPendiente(null); if (id) void reservar(id); }} />
      )}
    </Shell>
  );
}
