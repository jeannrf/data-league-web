import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import Shell from "../components/Shell";
import { useAuth } from "../lib/auth";
import { db, firebaseConfigured } from "../lib/firebase";
import { ADMIN_EMAIL, EDICION, eventos } from "../config";
import { ESTADOS, ESTADOS_SPONSOR, descargarCsv, estadoTexto, fecha, filasPersonas, type Post, type SponsorDoc } from "../lib/admin";
import { correoConfigurado, enviarCorreoEstado, tieneCorreo } from "../lib/correo";
import { tiposApoyo } from "../lib/sponsor";
import type { Inscripcion } from "../lib/eventos";

/* ---------- cambio de estado (con correo opcional) ---------- */
function CambioEstado({ items, nuevo, onClose, onDone }: { items: Post[]; nuevo: string; onClose: () => void; onDone: (msg: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const conCorreo = tieneCorreo(nuevo);
  const [enviar, setEnviar] = useState(conCorreo && correoConfigurado);
  const [nota, setNota] = useState("");
  const [busy, setBusy] = useState(false);
  const [progreso, setProgreso] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);

  async function confirmar() {
    if (!db) return;
    const firestore = db;
    setBusy(true);
    for (let i = 0; i < items.length; i += 400) {
      const b = writeBatch(firestore);
      items.slice(i, i + 400).forEach((p) => b.update(doc(firestore, "postulaciones", p.id), { estado: nuevo, actualizadoEn: serverTimestamp() }));
      await b.commit();
    }
    let ok = 0; const fallos: string[] = [];
    if (enviar && tieneCorreo(nuevo)) {
      for (const [i, p] of items.entries()) {
        setProgreso(`Enviando correos… ${i + 1} de ${items.length}`);
        const err = await enviarCorreoEstado(p, nuevo, nota);
        if (err) fallos.push(`${p.correo} (${err})`);
        else { ok++; await updateDoc(doc(firestore, "postulaciones", p.id), { correoEstado: nuevo, correoEnviadoEn: serverTimestamp() }).catch(() => undefined); }
        if (i < items.length - 1) await new Promise((r) => setTimeout(r, 700));   // el plan gratuito de EmailJS limita la velocidad
      }
    }
    const base = `${items.length} postulación(es) pasaron a «${estadoTexto(nuevo)}».`;
    onDone(enviar ? `${base} Correos enviados: ${ok}${fallos.length ? `. No se pudieron enviar ${fallos.length}: ${fallos.join("; ")}` : "."}` : base);
    setBusy(false);
    onClose();
  }

  return (
    <dialog ref={ref} className="auth-modal" aria-labelledby="ce-t" onClose={onClose} onClick={(e) => { if (e.target === ref.current && !busy) onClose(); }}>
      <div className="auth-box">
        <h2 id="ce-t" className="title text-2xl">Pasar a «{estadoTexto(nuevo)}»</h2>
        <p className="mt-3 text-ink">{items.length === 1 ? items[0].nombre : `${items.length} postulaciones seleccionadas`}</p>
        {conCorreo && (
          <div className="mt-5 grid gap-3">
            <label className="check"><input type="checkbox" checked={enviar} disabled={!correoConfigurado || busy} onChange={(e) => setEnviar(e.target.checked)} /><span>Enviar correo a {items.length === 1 ? items[0].correo : "cada persona que lidera o postula"}</span></label>
            {!correoConfigurado && <p className="text-[0.9rem] text-muted">Los correos no están configurados (EmailJS). El estado se cambia igual; mira docs/firebase-setup.md para activarlos.</p>}
            {enviar && (
              <div className="field">
                <label htmlFor="ce-nota">Mensaje para la persona (opcional)</label>
                <p className="hint" id="ce-hint">{nuevo === "aprobada" ? "Se agrega al final del correo." : "Explica qué hay que corregir o el motivo. Se agrega al correo."}</p>
                <textarea id="ce-nota" className="area" rows={4} aria-describedby="ce-hint" value={nota} onChange={(e) => setNota(e.target.value)} />
              </div>
            )}
          </div>
        )}
        {progreso && busy && <p role="status" className="mt-4 text-soft">{progreso}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn" disabled={busy} onClick={() => void confirmar()}>{busy ? "Guardando…" : enviar && conCorreo ? "Cambiar y enviar correo" : "Cambiar estado"}</button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- ficha de una postulación ---------- */
function Ficha({ p, onClose, onCambiar }: { p: Post; onClose: () => void; onCambiar: (nuevo: string) => void }) {
  const { user } = useAuth();
  const ref = useRef<HTMLDialogElement>(null);
  const [notas, setNotas] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  useEffect(() => {
    if (!db) return;
    getDoc(doc(db, "notasAdmin", p.id)).then((s) => setNotas(s.exists() ? (s.data().notas as string) : "")).catch(() => undefined);
  }, [p.id]);
  async function guardarNotas() {
    if (!db || !user) return;
    try { await setDoc(doc(db, "notasAdmin", p.id), { edicion: EDICION, notas, actualizadoPor: user.uid, actualizadoEn: serverTimestamp() }); setMsg("Notas guardadas."); }
    catch { setMsg("No se pudieron guardar las notas."); }
  }
  const row = (k: string, v: string | number | undefined) => <div className="sum-row"><dt>{k}</dt><dd>{v || "—"}</dd></div>;
  return (
    <dialog ref={ref} className="ficha" aria-labelledby="ficha-t" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="ficha-box">
        <button type="button" className="auth-x" aria-label="Cerrar" onClick={onClose}>×</button>
        <h2 id="ficha-t" className="title text-3xl">{p.nombre}</h2>
        <p className="mt-1 text-muted">{p.modo === "equipo" ? `Equipo de ${1 + (p.integrantes?.length ?? 0)} personas` : "Postulación individual"} · registrada {fecha(p.creadoEn)}</p>
        <div className="mt-6 grid gap-2">
          <label htmlFor="estado-sel" className="font-bold text-ink">Estado</label>
          <select id="estado-sel" className="adm-input" value={ESTADOS.some((e) => e.v === p.estado) ? p.estado : ""} onChange={(e) => { if (e.target.value && e.target.value !== p.estado) onCambiar(e.target.value); }}>
            {!ESTADOS.some((e) => e.v === p.estado) && <option value="">{estadoTexto(p.estado)}</option>}
            {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
          </select>
          {p.correoEstado && <p className="text-[0.9rem] text-muted">Último correo: «{estadoTexto(p.correoEstado)}», {fecha(p.correoEnviadoEn)}.</p>}
        </div>
        <dl className="summary mt-6">
          {row("Correo", p.correo)}
          {row("WhatsApp", p.whatsapp)}
          {(p.integrantes ?? []).map((m, i) => row(`Integrante ${i + 1}`, `${m.nombre} · ${m.correo} · ${m.whatsapp}`))}
        </dl>
        <div className="mt-6 grid gap-2">
          <label htmlFor="notas" className="font-bold text-ink">Notas internas (solo admins)</label>
          <textarea id="notas" className="area" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} />
          <div className="flex items-center gap-4"><button type="button" className="btn btn-ghost" onClick={() => void guardarNotas()}>Guardar notas</button>{msg && <span role="status" className="text-soft">{msg}</span>}</div>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- tabla de postulaciones ---------- */
function Postulaciones({ posts }: { posts: Post[] }) {
  const [q, setQ] = useState("");
  const [fModo, setFModo] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<Post | null>(null);
  const [msg, setMsg] = useState("");
  const [cambio, setCambio] = useState<{ items: Post[]; nuevo: string } | null>(null);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (fModo && p.modo !== fModo) return false;
      if (fEstado && p.estado !== fEstado) return false;
      if (!t) return true;
      const hay = [p.nombre, p.correo, p.whatsapp, ...(p.integrantes ?? []).flatMap((m) => [m.nombre, m.correo, m.whatsapp])].join(" ").toLowerCase();
      return hay.includes(t);
    });
  }, [posts, q, fModo, fEstado]);

  const personas = posts.reduce((n, p) => n + 1 + (p.integrantes?.length ?? 0), 0);
  const equipos = posts.filter((p) => p.modo === "equipo").length;
  const todosSel = lista.length > 0 && lista.every((p) => sel.has(p.id));
  const openFresh = open ? posts.find((p) => p.id === open.id) ?? open : null;

  async function copiarWhatsapp() {
    const ps = lista.filter((p) => !sel.size || sel.has(p.id));
    const nums = ps.flatMap((p) => [p.whatsapp, ...(p.integrantes ?? []).map((m) => m.whatsapp)]);
    await navigator.clipboard.writeText(nums.join("\n"));
    setMsg(`${nums.length} números copiados.`);
  }

  return (
    <div>
      <div className="adm-kpis" role="group" aria-label="Resumen">
        <div><b>{posts.length}</b><span>postulaciones</span></div>
        <div><b>{personas}</b><span>personas</span></div>
        <div><b>{equipos}</b><span>equipos</span></div>
        <div><b>{posts.length - equipos}</b><span>individuales</span></div>
        <div><b>{posts.filter((p) => p.estado === "registrada").length}</b><span>pendientes</span></div>
      </div>

      <div className="adm-bar">
        <input className="adm-input" type="search" placeholder="Buscar por nombre, correo o celular" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="adm-input" aria-label="Filtrar por modo" value={fModo} onChange={(e) => setFModo(e.target.value)}><option value="">Equipo e individual</option><option value="equipo">Equipo</option><option value="individual">Individual</option></select>
        <select className="adm-input" aria-label="Filtrar por estado" value={fEstado} onChange={(e) => setFEstado(e.target.value)}><option value="">Todos los estados</option>{ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}<option value="retirada">Retirada</option></select>
      </div>
      <div className="adm-bar">
        <span className="text-soft">{lista.length} de {posts.length} · {sel.size} seleccionada(s)</span>
        <select className="adm-input" aria-label="Cambiar estado de la selección" value="" disabled={!sel.size} onChange={(e) => { if (e.target.value) setCambio({ items: posts.filter((p) => sel.has(p.id)), nuevo: e.target.value }); }}><option value="">Cambiar estado de la selección…</option>{ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}</select>
        <button type="button" className="btn btn-ghost adm-btn" onClick={() => descargarCsv(`postulaciones-${EDICION}.csv`, filasPersonas(lista))}>Exportar CSV</button>
        <button type="button" className="btn btn-ghost adm-btn" onClick={() => void copiarWhatsapp()}>Copiar WhatsApp</button>
      </div>
      {msg && <p role="status" className="mb-3 text-ink">{msg}</p>}

      <div className="adm-scroll">
        <table className="adm-table">
          <thead><tr>
            <th><input type="checkbox" aria-label="Seleccionar todas" checked={todosSel} onChange={() => setSel(todosSel ? new Set() : new Set(lista.map((p) => p.id)))} /></th>
            <th>Nombre</th><th>Correo</th><th>Celular</th><th>Equipo</th><th>Estado</th><th>Registro</th>
          </tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className={sel.has(p.id) ? "sel" : ""}>
                <td><input type="checkbox" aria-label={`Seleccionar a ${p.nombre}`} checked={sel.has(p.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(p.id)) n.delete(p.id); else n.add(p.id); return n; })} /></td>
                <td><button type="button" className="link-btn" onClick={() => setOpen(p)}>{p.nombre}</button></td>
                <td>{p.correo}</td>
                <td>{p.whatsapp}</td>
                <td>{p.modo === "equipo" ? `Equipo (${1 + (p.integrantes?.length ?? 0)})` : "Individual"}</td>
                <td><span className={`pill e-${p.estado}`}>{estadoTexto(p.estado)}</span></td>
                <td>{fecha(p.creadoEn)}</td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={7} className="py-8 text-center text-soft">{posts.length ? "Ninguna postulación coincide con los filtros." : "Todavía no hay postulaciones."}</td></tr>}
          </tbody>
        </table>
      </div>
      {openFresh && !cambio && <Ficha p={openFresh} onClose={() => setOpen(null)} onCambiar={(nuevo) => setCambio({ items: [openFresh], nuevo })} />}
      {cambio && <CambioEstado items={cambio.items} nuevo={cambio.nuevo} onClose={() => setCambio(null)} onDone={(m) => { setMsg(m); setSel(new Set()); setOpen(null); }} />}
    </div>
  );
}

/* ---------- sponsors ---------- */
function Sponsors({ items }: { items: SponsorDoc[] }) {
  async function estado(id: string, v: string) { if (db) await updateDoc(doc(db, "sponsors", id), { estado: v }); }
  const tipo = (v: string) => tiposApoyo.find((t) => t.v === v)?.t ?? v;
  function exportar() {
    descargarCsv(`sponsors-${EDICION}.csv`, [["Organización", "Contacto", "Cargo", "Correo", "Teléfono", "Apoyo", "Mensaje", "Estado", "Fecha"],
      ...items.map((s) => [s.organizacion, s.contacto, s.cargo, s.correo, s.telefono, s.tipoApoyo.map(tipo).join(" / "), s.mensaje, s.estado, s.creadoEn ? s.creadoEn.toDate().toISOString() : ""])]);
  }
  return (
    <div>
      <div className="adm-bar"><span className="text-soft">{items.length} solicitud(es)</span><button type="button" className="btn btn-ghost adm-btn" onClick={exportar}>Exportar CSV</button></div>
      <div className="adm-scroll">
        <table className="adm-table">
          <thead><tr><th>Organización</th><th>Contacto</th><th>Correo</th><th>Apoyo</th><th>Mensaje</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id}>
                <td><b>{s.organizacion}</b></td>
                <td>{s.contacto}<br /><span className="text-muted">{s.cargo}{s.telefono ? ` · ${s.telefono}` : ""}</span></td>
                <td><a href={`mailto:${s.correo}`}>{s.correo}</a></td>
                <td>{s.tipoApoyo.map(tipo).join(", ")}</td>
                <td className="adm-msg">{s.mensaje || "—"}</td>
                <td><select className="adm-input" aria-label={`Estado de ${s.organizacion}`} value={s.estado} onChange={(e) => void estado(s.id, e.target.value)}>{ESTADOS_SPONSOR.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}</select></td>
                <td>{fecha(s.creadoEn)}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={7} className="py-8 text-center text-soft">Todavía no hay solicitudes de sponsors.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- inscripciones a las jornadas virtuales ---------- */
function Jornadas({ items }: { items: Inscripcion[] }) {
  const [ev, setEv] = useState(eventos[0]?.id ?? "");
  const lista = items.filter((i) => i.evento === ev);
  const nombreEv = (id: string) => eventos.find((e) => e.id === id)?.tema ?? id;
  function exportar() {
    descargarCsv(`inscritos-${ev}.csv`, [["Jornada", "Nombre", "Correo", "Fecha de inscripción"], ...lista.map((i) => [nombreEv(i.evento), i.nombre, i.correo, i.creadoEn ? i.creadoEn.toDate().toISOString() : ""])]);
  }
  return (
    <div>
      <div className="adm-kpis" role="group" aria-label="Inscritos por jornada">
        {eventos.map((e) => <div key={e.id}><b>{items.filter((i) => i.evento === e.id).length}</b><span>{e.dia} {e.mes} · {e.tema}</span></div>)}
      </div>
      <div className="adm-bar">
        <select className="adm-input" aria-label="Jornada" value={ev} onChange={(e) => setEv(e.target.value)}>{eventos.map((e) => <option key={e.id} value={e.id}>{e.dia} {e.mes} · {e.tema}</option>)}</select>
        <span className="text-soft">{lista.length} inscrito(s)</span>
        <button type="button" className="btn btn-ghost adm-btn" onClick={exportar}>Exportar CSV</button>
        <button type="button" className="btn btn-ghost adm-btn" onClick={() => void navigator.clipboard.writeText(lista.map((i) => i.correo).join(", "))}>Copiar correos</button>
      </div>
      <div className="adm-scroll">
        <table className="adm-table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Inscrito</th></tr></thead>
          <tbody>
            {lista.map((i) => <tr key={i.id}><td>{i.nombre}</td><td>{i.correo}</td><td>{fecha(i.creadoEn)}</td></tr>)}
            {!lista.length && <tr><td colSpan={3} className="py-8 text-center text-soft">Todavía no hay inscritos en esta jornada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- acceso: solo la contraseña de administrador ---------- */
function Login() {
  const { signInAdmin } = useAuth();
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const err = await signInAdmin(pass);
    if (err) setMsg(err);
    setBusy(false);
  }
  return (
    <form className="mx-auto grid max-w-sm gap-5 pt-10" onSubmit={enviar}>
      <h1 className="title h-lg">Administración</h1>
      <div className="field">
        <label htmlFor="adm-pass">Contraseña de administrador</label>
        <input id="adm-pass" type="password" autoComplete="current-password" autoFocus required value={pass} onChange={(e) => setPass(e.target.value)} />
      </div>
      {msg && <p role="alert" className="err">{msg}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
    </form>
  );
}

/* ---------- página ---------- */
export default function Admin() {
  const { user, loading, signOut } = useAuth();
  const [tab, setTab] = useState<"post" | "spon" | "ev">("post");
  const [insc, setInsc] = useState<Inscripcion[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [spons, setSpons] = useState<SponsorDoc[]>([]);
  const [error, setError] = useState("");
  // Esto solo decide qué se muestra; quien protege los datos son las reglas de Firestore.
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin || !db) return;
    const u1 = onSnapshot(query(collection(db, "postulaciones"), orderBy("creadoEn", "desc")),
      (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, "id">) }))), () => setError("No se pudieron cargar las postulaciones."));
    const u2 = onSnapshot(query(collection(db, "sponsors"), orderBy("creadoEn", "desc")),
      (s) => setSpons(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SponsorDoc, "id">) }))), () => setError("No se pudieron cargar los sponsors."));
    const u3 = onSnapshot(query(collection(db, "inscripciones"), orderBy("creadoEn", "desc")),
      (s) => setInsc(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Inscripcion, "id">) }))), () => setError("No se pudieron cargar las inscripciones."));
    return () => { u1(); u2(); u3(); };
  }, [isAdmin]);

  let body;
  if (!firebaseConfigured) body = <p className="text-xl text-ink">Falta configurar Firebase (ver docs/firebase-setup.md).</p>;
  else if (loading) body = <p role="status" className="text-xl text-ink">Cargando…</p>;
  else if (!isAdmin) body = <Login />;
  else body = (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="title h-lg">Panel de administración</h1>
        <button type="button" className="link-btn" onClick={() => void signOut()}>Cerrar sesión</button>
      </div>
      <div className="adm-tabs" role="tablist" aria-label="Secciones">
        <button role="tab" aria-selected={tab === "post"} onClick={() => setTab("post")}>Postulaciones ({posts.length})</button>
        <button role="tab" aria-selected={tab === "spon"} onClick={() => setTab("spon")}>Sponsors ({spons.length})</button>
        <button role="tab" aria-selected={tab === "ev"} onClick={() => setTab("ev")}>Jornadas ({insc.length})</button>
      </div>
      {error && <p className="err mb-4" role="alert">{error}</p>}
      <div className="mt-6">{tab === "post" ? <Postulaciones posts={posts} /> : tab === "spon" ? <Sponsors items={spons} /> : <Jornadas items={insc} />}</div>
    </>
  );

  return <Shell><div className="wrap py-10 md:py-14">{body}</div></Shell>;
}
