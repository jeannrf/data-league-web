import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { doc, getDoc } from "firebase/firestore";
import Shell from "../components/Shell";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../lib/auth";
import { db, firebaseConfigured } from "../lib/firebase";
import { eventos, POSTULACION_ABIERTA } from "../config";
import { cancelarInscripcion, descargarIcs, nombreDe, useMisInscripciones } from "../lib/eventos";
import { estadoTexto } from "../lib/admin";

const iniciales = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export default function Cuenta() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { ids } = useMisInscripciones(user?.uid);
  const [estado, setEstado] = useState<string | null | undefined>(undefined);   // undefined: cargando · null: sin postulación

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, "postulaciones", user.uid)).then((s) => setEstado(s.exists() && s.data().estado !== "retirada" ? (s.data().estado as string) : null)).catch(() => setEstado(null));
  }, [user]);

  const mias = eventos.filter((e) => ids.has(e.id));

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        {!firebaseConfigured ? (
          <p className="text-xl text-ink">Falta configurar Firebase (ver docs/firebase-setup.md).</p>
        ) : loading ? (
          <p role="status" className="text-xl text-ink">Cargando…</p>
        ) : !user ? (
          <>
            <p className="text-xl text-ink">Inicia sesión con Google para ver tu cuenta.</p>
            <AuthModal open onClose={() => navigate("/")} onSignedIn={() => undefined} title="Inicia sesión" text="Usa tu cuenta de Google para ver tu postulación y tus inscripciones." />
          </>
        ) : (
          <>
            <header className="acc-head">
              <span className="acc-avatar" aria-hidden="true">{iniciales(nombreDe(user))}</span>
              <div className="min-w-0">
                <p className="acc-kicker">Mi cuenta</p>
                <h1 className="title break-words text-[clamp(1.6rem,4vw,2.4rem)]">{nombreDe(user)}</h1>
                <p className="mt-1 break-all text-soft">{user.email}</p>
              </div>
              <button type="button" className="btn btn-ghost btn-danger acc-out" onClick={() => void signOut().then(() => navigate("/"))}>Cerrar sesión</button>
            </header>

            <div className="acc-grid">
              <section className="acc-card" aria-labelledby="c-post">
                <p className="acc-kicker">Liga 2026</p>
                <h2 id="c-post" className="title text-2xl">Mi postulación</h2>
                {estado === undefined ? <p className="mt-5 text-soft" role="status">Cargando…</p>
                  : estado ? (<>
                      <p className="mt-5"><span className={`acc-chip acc-${estado}`}>{estadoTexto(estado)}</span></p>
                      <p className="mt-3 text-soft">Aquí puedes revisar los datos de tu equipo y el avance de tu postulación.</p>
                      <Link to="/mi-postulacion" className="btn btn-ghost mt-auto no-underline">Ver mi postulación</Link>
                    </>)
                    : (<>
                      <p className="mt-5 text-soft">Todavía no postulaste a la liga. Postula a tu equipo antes del 29 de noviembre.</p>
                      {POSTULACION_ABIERTA && <Link to="/postular" className="btn mt-auto no-underline">Postular</Link>}
                    </>)}
              </section>

              <section className="acc-card" aria-labelledby="c-ev">
                <p className="acc-kicker">Jornadas virtuales</p>
                <h2 id="c-ev" className="title text-2xl">Mis jornadas</h2>
                {mias.length === 0 ? <p className="mt-5 text-soft">No estás inscrito a ninguna jornada virtual.</p> : (
                  <ul className="mt-4">
                    {mias.map((e) => (
                      <li key={e.id} className="acc-ev">
                        <span className="acc-date"><b>{e.dia}</b>{e.mes}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold text-ink">{e.tema}</span>
                          <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <button type="button" className="link-btn" onClick={() => descargarIcs(e)}>Añadir al calendario</button>
                            <button type="button" className="link-btn" onClick={() => { if (window.confirm("¿Cancelar tu inscripción a esta jornada?")) void cancelarInscripcion(user, e.id); }}>Cancelar</button>
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/eventos" className="btn btn-ghost mt-auto no-underline">{mias.length ? "Ver todas las jornadas" : "Explorar jornadas"}</Link>
              </section>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
