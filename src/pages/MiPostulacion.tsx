import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { doc, getDoc, serverTimestamp, updateDoc, type Timestamp } from "firebase/firestore";
import { useAuth } from "../lib/auth";
import { db, firebaseConfigured } from "../lib/firebase";
import Shell from "../components/Shell";
import Network from "../components/Network";
import TeamNet from "../components/TeamNet";

type Miembro = { nombre: string; correo: string; whatsapp: string };
type Post = {
  modo: "equipo" | "individual"; estado: string; nombre: string; correo: string; whatsapp: string;
  integrantes?: Miembro[]; creadoEn?: Timestamp;
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

/** Al enviar: tu equipo cae sobre el mapa y se une a la red, en el nodo de origen. */
function JoinMap({ members }: { members: string[] }) {
  const box = useRef<HTMLDivElement>(null);
  const team = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const b = box.current, t = team.current, rg = ring.current;
    const origin = b?.querySelector("[data-origin]");
    if (!b || !t || !rg || !origin) return;
    const br = b.getBoundingClientRect(), o = origin.getBoundingClientRect();
    rg.style.left = `${o.left + o.width / 2 - br.left}px`;
    rg.style.top = `${o.top + o.height / 2 - br.top}px`;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { t.style.opacity = "0"; return; }
    const tr = t.getBoundingClientRect();
    const dx = o.left + o.width / 2 - (tr.left + tr.width / 2), dy = o.top + o.height / 2 - (tr.top + tr.height / 2);
    const anim = t.animate(
      [{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: "translate(0,0) scale(1)", opacity: 1, offset: 0.35 }, { transform: `translate(${dx}px,${dy}px) scale(0.08)`, opacity: 0 }],
      { duration: 2400, delay: 600, easing: "cubic-bezier(0.6, 0, 0.3, 1)", fill: "forwards" },
    );
    const timer = window.setTimeout(() => rg.classList.add("go"), 600 + 2300);
    return () => { anim.cancel(); window.clearTimeout(timer); };
  }, []);
  return (
    <div ref={box} className="relative mx-auto my-10 h-[22rem] w-[16rem] md:mx-0 md:float-right md:my-0 md:h-[26rem] md:w-[19rem]">
      <Network origin className="h-full w-auto" />
      <span ref={ring} className="landing-ring" />
      <div ref={team} className="absolute inset-x-8 top-0"><TeamNet members={members} /></div>
    </div>
  );
}

export default function MiPostulacion() {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [error, setError] = useState("");
  const enviada = (location.state as { enviada?: boolean } | null)?.enviada;

  useEffect(() => {
    if (!user || !db) return;
    getDoc(doc(db, "postulaciones", user.uid))
      .then((s) => setPost(s.exists() ? (s.data() as Post) : null))
      .catch(() => setError("No pudimos cargar tu postulación. Inténtalo de nuevo."));
  }, [user]);

  async function retirar() {
    if (!user || !db) return;
    if (!window.confirm("¿Seguro que quieres retirar tu postulación? Esta acción no se puede deshacer.")) return;
    try {
      await updateDoc(doc(db, "postulaciones", user.uid), { estado: "retirada", actualizadoEn: serverTimestamp() });
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
      <div className="wrap py-10 md:py-16">
        {enviada && (
          <div className="mb-10 bg-accent p-6 text-bg" role="status">
            <p className="display text-3xl">¡Postulación enviada!</p>
            <p className="mt-2 font-bold">Ya estás dentro de Data League 2026. Te avisaremos por correo cuando haya novedades.</p>
          </div>
        )}
        {enviada && post && <JoinMap members={(post.integrantes ?? []).map((m) => m.nombre.trim()[0]?.toUpperCase() ?? "·")} />}
        <h1 className="title h-xl">Mi postulación</h1>
        {error && <p className="err mt-6" role="alert">{error}</p>}
        {post && (
          <>
            <p className="mt-8 text-2xl font-bold text-ink">Estado: <span className="text-accent">{est.t}</span></p>
            <p className="measure mt-2 text-xl">{est.d}</p>
            <dl className="summary mt-12">
              <div className="sum-row"><dt>Nombre</dt><dd>{post.nombre}</dd></div>
              <div className="sum-row"><dt>Contacto</dt><dd>{post.correo} · {post.whatsapp}</dd></div>
              <div className="sum-row"><dt>Modo</dt><dd>{post.modo === "equipo" ? `Equipo de ${1 + (post.integrantes?.length ?? 0)} personas` : "Individual"}</dd></div>
              {post.integrantes?.map((m, i) => <div className="sum-row" key={i}><dt>Integrante {i + 1}</dt><dd>{m.nombre} · {m.correo} · {m.whatsapp}</dd></div>)}
            </dl>
            <p className="measure mt-8 text-muted">Si necesitas corregir algún dato, escríbenos: la edición desde esta página llegará pronto.</p>
          </>
        )}
        <div className="mt-12 flex flex-wrap items-center gap-6">
          <Link to="/" className="btn btn-ghost no-underline">Volver al inicio</Link>
          {post && post.estado !== "retirada" && <button className="link-btn" onClick={() => void retirar()}>Retirar mi postulación</button>}
          <button className="link-btn" onClick={() => void signOut()}>Cerrar sesión</button>
        </div>
      </div>
    </Shell>
  );
}
