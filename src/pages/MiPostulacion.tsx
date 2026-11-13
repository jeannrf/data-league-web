import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { doc, getDoc, serverTimestamp, writeBatch, type Timestamp } from "firebase/firestore";
import { EDICION } from "../config";
import { useAuth } from "../lib/auth";
import { db, firebaseConfigured } from "../lib/firebase";
import Shell from "../components/Shell";
import { esEditable, postulacionCerrada } from "../lib/postulacion";

type Miembro = { nombre: string; correo: string; whatsapp: string };
type Post = {
  modo: "equipo" | "individual"; estado: string; nombre: string; correo: string; whatsapp: string; nombreEquipo?: string;
  integrantes?: Miembro[]; creadoEn?: Timestamp; editadoEn?: Timestamp;
};

const estados: Record<string, { t: string; d: string }> = {
  registrada: { t: "Pendiente", d: "Recibimos tu postulación. El equipo organizador la revisará y te avisará por correo." },
  aprobada: { t: "Aprobada", d: "¡Tu postulación fue aprobada! Te contaremos los siguientes pasos por correo." },
  observada: { t: "En observación", d: "Tu postulación tiene observaciones: hay datos por revisar. Te escribimos a tu correo con el detalle." },
  rechazada: { t: "Rechazada", d: "En esta ocasión tu postulación no fue aprobada. Gracias por participar." },
  retirada: { t: "Retirada", d: "Esta postulación fue retirada." },
  valida: { t: "Aprobada", d: "¡Tu postulación fue aprobada! Te contaremos los siguientes pasos por correo." },
  finalista: { t: "Aprobada", d: "¡Tu postulación fue aprobada! Te contaremos los siguientes pasos por correo." },
  no_seleccionada: { t: "Rechazada", d: "En esta ocasión tu postulación no fue aprobada. Gracias por participar." },
};

export default function MiPostulacion() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [error, setError] = useState("");
  const { enviada, editada } = (location.state as { enviada?: boolean; editada?: boolean } | null) ?? {};

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, "postulaciones", user.uid))
      .then((s) => setPost(s.exists() ? (s.data() as Post) : null))
      .catch(() => setError("No pudimos cargar tu postulación. Inténtalo de nuevo."));
  }, [user]);

  async function retirar() {
    if (!user || !db) return;
    if (!window.confirm("¿Seguro que quieres retirar tu postulación? Podrás volver a postular mientras siga abierto el plazo.")) return;
    try {
      // Se libera el correo de cada persona del equipo para poder volver a postular.
      const b = writeBatch(db);
      b.update(doc(db, "postulaciones", user.uid), { estado: "retirada", actualizadoEn: serverTimestamp() });
      for (const c of [user.email ?? "", ...(post?.integrantes ?? []).map((m) => m.correo)]) b.delete(doc(db, "correosEdicion", `${EDICION}_${c.toLowerCase()}`));
      await b.commit();
      setPost((p) => (p ? { ...p, estado: "retirada" } : p));
    } catch { setError("No pudimos retirar la postulación. Escríbenos si el problema continúa."); }
  }

  if (!firebaseConfigured) return <Shell><div className="wrap py-16 text-xl text-ink">Falta configurar Firebase (ver <code>.env.example</code>).</div></Shell>;
  if (loading || (user && post === undefined && !error)) return <Shell><div className="wrap py-16 text-xl text-ink" role="status">Cargando…</div></Shell>;
  if (!user) return <Navigate to="/postular" replace />;
  if (post === null) return <Navigate to="/postular" replace />;

  const est = estados[post?.estado ?? "registrada"];

  return (
    <Shell>
      <div className="wrap py-8 md:py-6">
        {enviada && (
          <div className="mb-8 bg-accent p-6 text-bg md:mb-4 md:px-5 md:py-3" role="status">
            <p className="display text-3xl !text-bg md:text-xl">¡Postulación enviada!</p>
          </div>
        )}
        {editada && (
          <div className="mb-8 bg-accent p-6 text-bg md:mb-4 md:px-5 md:py-3" role="status">
            <p className="display text-3xl !text-bg md:text-xl">Cambios guardados</p>
          </div>
        )}
        <h1 className="title h-xl md:!text-4xl">Mi postulación</h1>
        {error && <p className="err mt-6" role="alert">{error}</p>}
        {post && (
          <>
            <p className="mt-8 text-2xl font-bold text-ink md:mt-3 md:text-xl">Estado: <span className="text-accent">{est.t}</span></p>
            <p className="measure mt-2 text-xl md:mt-1 md:text-base">{est.d}</p>
            <dl className="summary mt-12 md:mt-4">
              <div className="sum-row"><dt>Nombre</dt><dd>{post.nombre}</dd></div>
              <div className="sum-row"><dt>Contacto</dt><dd>{post.correo} · {post.whatsapp}</dd></div>
              {post.modo === "equipo" && post.nombreEquipo && <div className="sum-row"><dt>Nombre del equipo</dt><dd>{post.nombreEquipo}</dd></div>}
              <div className="sum-row"><dt>Modo</dt><dd>{post.modo === "equipo" ? `Equipo de ${1 + (post.integrantes?.length ?? 0)} personas` : "Individual"}</dd></div>
              {post.integrantes?.map((m, i) => <div className="sum-row" key={i}><dt>Integrante {i + 1}</dt><dd>{m.nombre} · {m.correo} · {m.whatsapp}</dd></div>)}
            </dl>
            {post && esEditable(post.estado) && !postulacionCerrada()
              ? <p className="measure mt-8 text-muted md:mt-3 md:text-sm">Puedes editar tus datos y tu equipo hasta el cierre de postulaciones.</p>
              : post.estado !== "retirada" && <p className="measure mt-8 text-muted md:mt-3 md:text-sm">Si necesitas corregir algún dato, escríbenos.</p>}
          </>
        )}
        <div className="mt-12 flex flex-wrap md:mt-4 items-center gap-6">
          <Link to="/" className="btn btn-ghost btn-sm no-underline">Volver al inicio</Link>
          {post?.estado === "retirada" && <Link to="/postular" className="btn btn-sm no-underline">Postular de nuevo</Link>}
          {post && esEditable(post.estado) && !postulacionCerrada() && <Link to="/postular?editar" className="btn btn-sm no-underline">Editar mi postulación</Link>}
          {post && post.estado !== "retirada" && <button className="link-btn" onClick={() => void retirar()}>Retirar mi postulación</button>}
          <button className="link-btn link-danger" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </div>
    </Shell>
  );
}
