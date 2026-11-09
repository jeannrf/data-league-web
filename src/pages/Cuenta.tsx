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

export default function Cuenta() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { ids } = useMisInscripciones(user?.uid);
  const [estado, setEstado] = useState<string | null | undefined>(undefined);   // undefined: cargando · null: sin postulación

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, "postulaciones", user.uid)).then((s) => setEstado(s.exists() ? (s.data().estado as string) : null)).catch(() => setEstado(null));
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
            <h1 className="title h-xl">Mi cuenta</h1>
            <p className="mt-4 text-xl text-ink">{nombreDe(user)} · <span className="text-soft">{user.email}</span></p>

            <section className="mt-12 border-t border-line pt-8" aria-labelledby="c-post">
              <h2 id="c-post" className="title text-3xl">Mi postulación</h2>
              {estado === undefined ? <p className="mt-4 text-soft" role="status">Cargando…</p>
                : estado ? (<>
                    <p className="mt-4 text-xl text-ink">Estado: <b className="text-accent">{estadoTexto(estado)}</b></p>
                    <Link to="/mi-postulacion" className="btn btn-ghost mt-6 no-underline">Ver mi postulación</Link>
                  </>)
                  : (<>
                    <p className="measure mt-4 text-soft">Todavía no postulaste a la liga.</p>
                    {POSTULACION_ABIERTA && <Link to="/postular" className="btn mt-6 no-underline">Postular</Link>}
                  </>)}
            </section>

            <section className="mt-12 border-t border-line pt-8" aria-labelledby="c-ev">
              <h2 id="c-ev" className="title text-3xl">Mis jornadas</h2>
              {mias.length === 0 ? <p className="measure mt-4 text-soft">No estás inscrito a ninguna jornada virtual.</p> : (
                <ul className="mt-4">
                  {mias.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
                      <span className="text-xl font-bold text-ink">{e.dia} {e.mes} · {e.tema}</span>
                      <span className="flex gap-5">
                        <button type="button" className="link-btn" onClick={() => descargarIcs(e)}>Añadir al calendario</button>
                        <button type="button" className="link-btn" onClick={() => { if (window.confirm("¿Cancelar tu inscripción a esta jornada?")) void cancelarInscripcion(user, e.id); }}>Cancelar</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/eventos" className="btn btn-ghost mt-6 no-underline">Ver todas las jornadas</Link>
            </section>

            <button type="button" className="link-btn mt-14" onClick={() => void signOut().then(() => navigate("/"))}>Cerrar sesión</button>
          </>
        )}
      </div>
    </Shell>
  );
}
