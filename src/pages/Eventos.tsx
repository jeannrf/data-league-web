import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import Shell from "../components/Shell";
import AuthModal from "../components/AuthModal";
import Flyer from "../components/Flyer";
import { useAuth } from "../lib/auth";
import { eventos, type Jornada } from "../config";
import { cancelarInscripcion, inscribirse, useMisInscripciones, yaPaso } from "../lib/eventos";

/** Ventana con la información de una jornada: flyer a un lado, datos y enlace al otro. La cuenta solo sirve para recibir recordatorios. */
function InfoEvento({ e, inscrito, paso, onClose, onInscribir }: { e: Jornada & { id: string }; inscrito: boolean; paso: boolean; onClose: () => void; onInscribir: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const fl = new Date(`${e.fecha}T12:00:00-05:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  const fechaLarga = fl.charAt(0).toUpperCase() + fl.slice(1);
  return (
    <dialog ref={ref} className="auth-modal info-modal" aria-labelledby="info-t" onClose={onClose} onClick={(ev) => { if (ev.target === ref.current) onClose(); }}>
      <div className="info-box">
        <button type="button" className="auth-x" aria-label="Cerrar" onClick={onClose}>×</button>
        <div className="info-body">
          <Flyer e={e} />
          <div className="info-main">
            <p className="text-[0.8rem] font-black uppercase tracking-[0.16em] text-primary-text">Jornada virtual</p>
            <h2 id="info-t" className="title mt-2 pr-10 text-[clamp(1.6rem,4.6vw,2.3rem)] leading-[1.05]">{e.tema}</h2>

            <dl className="info-facts">
              <div><dt>Fecha</dt><dd>{fechaLarga}</dd></div>
              <div><dt>Hora</dt><dd>{e.hora ? <>{e.hora} <span className="font-normal text-soft">(hora de Perú)</span></> : "Por confirmar"}</dd></div>
              <div><dt>Dónde</dt><dd>En línea{e.enlace?.includes("meet.google.com") ? " por Google Meet" : ""}</dd></div>
            </dl>

            <section className="info-link">
              <h3 className="info-h">Enlace de la transmisión</h3>
              {e.enlace ? (
                <>
                  <a className="btn mt-3" href={e.enlace} target="_blank" rel="noreferrer">Entrar a la transmisión</a>
                  <p className="mt-2 break-all text-[0.95rem] text-soft"><a href={e.enlace} target="_blank" rel="noreferrer">{e.enlace}</a></p>
                </>
              ) : <p className="mt-2 text-soft">Lo publicaremos aquí antes de la jornada.</p>}
            </section>

            {e.descripcion && <section className="mt-6"><h3 className="info-h">Sobre el tema</h3><p className="mt-2 text-soft">{e.descripcion}</p></section>}
          </div>
        </div>
        <footer className="info-actions">
          {paso ? <span className="text-muted">Esta jornada ya pasó.</span>
            : inscrito ? <span className="font-bold text-accent" role="status">✓ Te enviaremos recordatorios a tu correo</span>
              : <>
                  <p className="info-nota">No necesitas cuenta para entrar. Si quieres, te avisamos por correo antes de la jornada.</p>
                  <button type="button" className="btn btn-ghost" onClick={onInscribir}>Recibir recordatorios</button>
                </>}
        </footer>
      </div>
    </dialog>
  );
}

const PENDIENTE = "dl-inscripcion-pendiente";

export default function Eventos() {
  const { user } = useAuth();
  const { ids } = useMisInscripciones(user?.uid);
  const [pendiente, setPendiente] = useState<string | null>(null);   // evento que se quería reservar antes de iniciar sesión
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reservar = useCallback(async (id: string) => {
    // Se recuerda la jornada: en celular Google puede iniciar sesión recargando la página (redirección) y se perdería.
    if (!user) { setPendiente(id); sessionStorage.setItem(PENDIENTE, id); return; }
    sessionStorage.removeItem(PENDIENTE);
    setBusy(id); setError("");
    try { await inscribirse(user, id); } catch (e) {
      console.error("inscripción:", e);
      setError((e as { code?: string }).code === "permission-denied"
        ? "No pudimos activar tus recordatorios: la base de datos todavía no lo permite (falta publicar las reglas de seguridad). Avisa al equipo organizador."
        : "No pudimos activar tus recordatorios. Revisa tu conexión e inténtalo de nuevo.");
    }
    setBusy(null);
  }, [user]);

  // Al volver de iniciar sesión por redirección, completa la inscripción que había quedado pendiente.
  useEffect(() => {
    // Con ventana emergente `pendiente` sigue en memoria y lo completa AuthModal; esto es solo para tras una recarga.
    const id = sessionStorage.getItem(PENDIENTE);
    if (user && id && !pendiente && eventos.some((e) => e.id === id)) void reservar(id);
  }, [user, reservar, pendiente]);

  async function quitar(id: string) {
    if (!user) return;
    if (!window.confirm("¿Dejar de recibir recordatorios de esta jornada?")) return;
    setBusy(id); setError("");
    try { await cancelarInscripcion(user, id); } catch { setError("No pudimos quitar tus recordatorios. Inténtalo de nuevo."); }
    setBusy(null);
  }

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        <h1 className="title h-xl">Jornadas virtuales</h1>
        <p className="measure mt-6 text-xl text-ink">Las jornadas son abiertas: entra con el enlace de cada una, sin registrarte. Si quieres que te avisemos por correo antes de cada jornada, activa los recordatorios con tu cuenta de Google.</p>
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
                  <p className="mt-2 text-soft">Virtual · {e.hora ? `${e.hora} (hora de Perú)` : "Hora por confirmar"}</p>
                  {e.enlace && !paso && <p className="mt-3"><a href={e.enlace} className="font-bold" target="_blank" rel="noreferrer">Entrar a la transmisión</a></p>}
                  {inscrito && !paso && <p className="mt-2 font-bold text-accent" role="status">✓ Recibirás recordatorios por correo</p>}
                </div>
                <div className="evento-acc">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInfo(e.id)}>Ver info</button>
                  {paso ? <span className="text-muted">Ya pasó</span>
                    : inscrito ? <button type="button" className="link-btn" disabled={busy === e.id} onClick={() => void quitar(e.id)}>Quitar recordatorios</button>
                      : <button type="button" className="btn" disabled={busy === e.id} onClick={() => void reservar(e.id)}>{busy === e.id ? "Guardando…" : "Recibir recordatorios"}</button>}
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
        <AuthModal open title="Recibe recordatorios" text="Usa tu cuenta de Google. Solo guardamos tu nombre y tu correo para avisarte antes de la jornada."
          onClose={() => { setPendiente(null); sessionStorage.removeItem(PENDIENTE); }}
          onSignedIn={() => { const id = pendiente; setPendiente(null); if (id) void reservar(id); }} />
      )}
    </Shell>
  );
}
