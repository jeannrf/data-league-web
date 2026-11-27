import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { arrayUnion, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import Shell from "../components/Shell";
// El panel usa su propia sesión y su propia conexión (adminDb): la cuenta personal del navegador no cambia.
import { adminDb as db, firebaseConfigured } from "../lib/firebase";
import { entrarAdmin, salirAdmin, useAdminSession } from "../lib/adminSession";
import { EDICION, eventos, type Jornada } from "../config";
import { ESTADOS, ESTADOS_EXPERTO, ESTADOS_SPONSOR, descargarXlsx, estadoTexto, fecha, filasPersonas, type Post, type ExpertoDoc, type SponsorDoc } from "../lib/admin";
import { avisoBase, correoConfigurado, enviarAviso, enviarCorreoEstado, personalizar, tieneCorreo } from "../lib/correo";
import { tiposApoyo } from "../lib/sponsor";
import { aniosExperiencia, areasMentor, coleccion, disponibilidades, rolesPrevios, type Rol } from "../lib/experto";
import type { Inscripcion } from "../lib/eventos";

/* ---------- mensaje largo truncado con "Ver más" ---------- */
function Mensaje({ texto }: { texto: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [abierto, setAbierto] = useState(false);
  const [largo, setLargo] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !abierto) setLargo(el.scrollHeight > el.clientHeight + 1);
  }, [texto, abierto]);
  if (!texto) return <>—</>;
  return (
    <>
      <p ref={ref} className={abierto ? "adm-msg-txt" : "adm-msg-txt adm-msg-clamp"}>{texto}</p>
      {(largo || abierto) && (
        <button type="button" className="adm-msg-more" aria-expanded={abierto} onClick={() => setAbierto(!abierto)}>
          {abierto ? "Ver menos" : "Ver más"}
        </button>
      )}
    </>
  );
}

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
  const { user } = useAdminSession();
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
        {p.modo === "equipo" && <p className="mt-2 text-xl font-bold text-accent">{p.nombreEquipo || "Equipo sin nombre"}</p>}
        <p className="mt-1 text-muted">{p.modo === "equipo" ? `Equipo de ${1 + (p.integrantes?.length ?? 0)} personas` : "Postulación individual"} · registrada {fecha(p.creadoEn)}{p.editadoEn && <> · <span className="adm-tag">Editado</span> {fecha(p.editadoEn)}</>}</p>
        <div className="mt-6 grid gap-2">
          <label htmlFor="estado-sel" className="font-bold text-ink">Estado</label>
          <select id="estado-sel" className="adm-input" disabled={p.estado === "retirada"} value={ESTADOS.some((e) => e.v === p.estado) ? p.estado : ""} onChange={(e) => { if (e.target.value && e.target.value !== p.estado) onCambiar(e.target.value); }}>
            {!ESTADOS.some((e) => e.v === p.estado) && <option value="">{estadoTexto(p.estado)}</option>}
            {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
          </select>
          {p.estado === "retirada" && <p className="text-[0.9rem] text-muted">La retiró quien postuló; el estado ya no se puede cambiar.</p>}
          {p.correoEstado && <p className="text-[0.9rem] text-muted">Último correo: «{estadoTexto(p.correoEstado)}», {fecha(p.correoEnviadoEn)}.</p>}
        </div>
        <dl className="summary mt-6">
          {p.modo === "equipo" && row("Nombre del equipo", p.nombreEquipo)}
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
  const [open, setOpen] = useState<Post | null>(null);
  const [msg, setMsg] = useState("");
  const [cambio, setCambio] = useState<{ items: Post[]; nuevo: string } | null>(null);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (fModo && p.modo !== fModo) return false;
      if (fEstado && p.estado !== fEstado) return false;
      if (!t) return true;
      const hay = [p.nombre, p.nombreEquipo ?? "", p.correo, p.whatsapp, ...(p.integrantes ?? []).flatMap((m) => [m.nombre, m.correo, m.whatsapp])].join(" ").toLowerCase();
      return hay.includes(t);
    });
  }, [posts, q, fModo, fEstado]);

  const personas = posts.reduce((n, p) => n + 1 + (p.integrantes?.length ?? 0), 0);
  const equipos = posts.filter((p) => p.modo === "equipo").length;
  const openFresh = open ? posts.find((p) => p.id === open.id) ?? open : null;

  /** Los estados que avisan por correo abren la ventana de confirmación; «Pendiente» se guarda directo. */
  function cambiarEstado(p: Post, nuevo: string) {
    if (!nuevo || nuevo === p.estado) return;
    if (tieneCorreo(nuevo)) setCambio({ items: [p], nuevo });
    else if (db) void updateDoc(doc(db, "postulaciones", p.id), { estado: nuevo, actualizadoEn: serverTimestamp() }).catch(() => setMsg("No se pudo cambiar el estado."));
  }

  async function exportar() {
    try { await descargarXlsx(`postulaciones-${EDICION}.xlsx`, filasPersonas(lista), "Postulaciones"); }
    catch { setMsg("No se pudo generar el archivo Excel."); }
  }

  return (
    <div>
      <div className="adm-kpis" role="group" aria-label="Resumen">
        <div><b>{posts.length}</b><span>postulaciones</span></div>
        <div><b>{personas}</b><span>personas</span></div>
        <div><b>{equipos}</b><span>equipos</span></div>
        <div><b>{posts.length - equipos}</b><span>individuales</span></div>
        <div><b>{posts.filter((p) => p.estado === "registrada").length}</b><span>pendientes</span></div>
        <button type="button" className="btn btn-ghost adm-btn ml-auto self-center" onClick={() => void exportar()}>Exportar XLSX</button>
      </div>

      <div className="adm-bar">
        <input className="adm-input" type="search" placeholder="Buscar por nombre, equipo, correo o celular" aria-label="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="adm-seg" role="group" aria-label="Filtrar por modo">
          <button type="button" aria-pressed={fModo === ""} className={`btn adm-btn${fModo === "" ? "" : " btn-ghost"}`} onClick={() => setFModo("")}>Todos ({posts.length})</button>
          <button type="button" aria-pressed={fModo === "equipo"} className={`btn adm-btn${fModo === "equipo" ? "" : " btn-ghost"}`} onClick={() => setFModo("equipo")}>Equipo ({equipos})</button>
          <button type="button" aria-pressed={fModo === "individual"} className={`btn adm-btn${fModo === "individual" ? "" : " btn-ghost"}`} onClick={() => setFModo("individual")}>Individual ({posts.length - equipos})</button>
        </div>
        <select className="adm-input" aria-label="Filtrar por estado" value={fEstado} onChange={(e) => setFEstado(e.target.value)}><option value="">Todos los estados</option>{ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}<option value="retirada">Retirada</option></select>
      </div>
      {msg && <p role="status" className="mb-3 text-ink">{msg}</p>}

      <div className="adm-scroll">
        <table className="adm-table">
          <thead><tr>
            <th>Nombre del equipo</th><th>Nombre del líder</th><th>Correo</th><th>Celular</th><th>Estado</th><th>Registro</th><th>Info</th>
          </tr></thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id}>
                <td>{p.modo === "equipo" ? <><b className="text-ink">{p.nombreEquipo || "Equipo sin nombre"}</b><br /><span className="text-muted">{1 + (p.integrantes?.length ?? 0)} personas</span></> : <span className="text-muted">Individual</span>}</td>
                <td><button type="button" className="link-btn" onClick={() => setOpen(p)}>{p.nombre}</button></td>
                <td>{p.correo}</td>
                <td>{p.whatsapp}</td>
                <td>
                  <select className={`adm-input pill-select e-${p.estado}`} aria-label={`Estado de ${p.nombreEquipo || p.nombre}`} disabled={p.estado === "retirada"} title={p.estado === "retirada" ? "La retiró quien postuló; no se puede cambiar." : undefined} value={ESTADOS.some((e) => e.v === p.estado) ? p.estado : ""} onChange={(e) => cambiarEstado(p, e.target.value)}>
                    {!ESTADOS.some((e) => e.v === p.estado) && <option value="">{estadoTexto(p.estado)}</option>}
                    {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
                  </select>
                </td>
                <td>{fecha(p.creadoEn)}{p.editadoEn && <><br /><span className="adm-tag" title={`Editada por quien postuló el ${fecha(p.editadoEn)}`}>Editado</span></>}</td>
                <td><button type="button" className="btn btn-ghost adm-btn" aria-label={`Ver info de ${p.nombreEquipo || p.nombre}`} onClick={() => setOpen(p)}>Info</button></td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={7} className="py-8 text-center text-soft">{posts.length ? "Ninguna postulación coincide con los filtros." : "Todavía no hay postulaciones."}</td></tr>}
          </tbody>
        </table>
      </div>
      {openFresh && !cambio && <Ficha p={openFresh} onClose={() => setOpen(null)} onCambiar={(nuevo) => setCambio({ items: [openFresh], nuevo })} />}
      {cambio && <CambioEstado items={cambio.items} nuevo={cambio.nuevo} onClose={() => setCambio(null)} onDone={(m) => { setMsg(m); setOpen(null); }} />}
    </div>
  );
}

/* ---------- sponsors ---------- */
function Sponsors({ items }: { items: SponsorDoc[] }) {
  async function estado(id: string, v: string) { if (db) await updateDoc(doc(db, "sponsors", id), { estado: v }); }
  const tipo = (v: string) => tiposApoyo.find((t) => t.v === v)?.t ?? v;
  async function exportar() {
    await descargarXlsx(`sponsors-${EDICION}.xlsx`, [["Organización", "Contacto", "Cargo", "Correo", "Teléfono", "Apoyo", "Mensaje", "Estado", "Fecha"],
      ...items.map((s) => [s.organizacion, s.contacto, s.cargo, s.correo, s.telefono, s.tipoApoyo.map(tipo).join(" / "), s.mensaje, s.estado, s.creadoEn ? s.creadoEn.toDate().toISOString() : ""])], "Sponsors");
  }
  return (
    <div>
      <div className="adm-bar"><span className="text-soft">{items.length} solicitud(es)</span><button type="button" className="btn btn-ghost adm-btn" onClick={() => void exportar()}>Exportar XLSX</button></div>
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
                <td className="adm-msg"><Mensaje texto={s.mensaje} /></td>
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

/* ---------- mentores y jurados ---------- */
type Opc = readonly { v: string; t: string }[];
const txt = (l: Opc, v?: string) => (v ? l.find((o) => o.v === v)?.t ?? v : "");
const lista = (l: Opc, vs?: string[]) => (vs ?? []).map((v) => txt(l, v)).join(", ");
const experiencia = (m: ExpertoDoc) => [txt(aniosExperiencia, m.anios), lista(rolesPrevios, m.rolesPrevios)].filter(Boolean).join(" · ");

function EstadoExperto({ m, rol, id }: { m: ExpertoDoc; rol: Rol; id?: string }) {
  async function cambiar(v: string) { if (db) await updateDoc(doc(db, coleccion[rol], m.id), { estado: v }); }
  return (
    <select id={id} className="adm-input" aria-label={id ? undefined : `Estado de ${m.nombre}`} value={m.estado} onChange={(e) => void cambiar(e.target.value)}>
      {ESTADOS_EXPERTO.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
    </select>
  );
}

function FichaExperto({ m, rol, onClose }: { m: ExpertoDoc; rol: Rol; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const row = (k: string, v: React.ReactNode) => <div className="sum-row"><dt>{k}</dt><dd>{v || "—"}</dd></div>;
  const largo = (k: string, v?: string) => <div className="sum-row"><dt>{k}</dt><dd className="sum-long">{v || "—"}</dd></div>;
  const url = m.perfil && /^https?:\/\//i.test(m.perfil) ? m.perfil : "";
  return (
    <dialog ref={ref} className="ficha" aria-labelledby="ficha-x" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="ficha-box">
        <button type="button" className="auth-x" aria-label="Cerrar" onClick={onClose}>×</button>
        <h2 id="ficha-x" className="title text-3xl">{m.nombre}</h2>
        <p className="mt-2 text-lg text-ink">{m.ocupacion}</p>
        <p className="mt-1 text-muted">{rol === "jurado" ? "Jurado" : "Mentor"} · postuló {fecha(m.creadoEn)}</p>
        <div className="mt-6 grid gap-2">
          <label htmlFor="estado-exp" className="font-bold text-ink">Estado</label>
          <EstadoExperto m={m} rol={rol} id="estado-exp" />
        </div>
        <dl className="summary mt-6">
          {row("Correo", <a href={`mailto:${m.correo}`}>{m.correo}</a>)}
          {row("Teléfono", m.telefono)}
          {row("LinkedIn o web", url ? <a href={url} target="_blank" rel="noopener noreferrer">{m.perfil}</a> : m.perfil)}
          {row("Años de experiencia", txt(aniosExperiencia, m.anios))}
          {row("Participó antes como", lista(rolesPrevios, m.rolesPrevios))}
          {row("Áreas", lista(areasMentor, m.areas))}
          {rol === "jurado" && row("Disponibilidad", txt(disponibilidades, m.disponibilidad))}
          {largo("Trayectoria", m.trayectoria)}
          {largo("Referencias", m.referencias)}
          {largo("Mensaje", m.mensaje)}
        </dl>
      </div>
    </dialog>
  );
}

function Expertos({ rol, items }: { rol: Rol; items: ExpertoDoc[] }) {
  const jurado = rol === "jurado";
  const nombreRol = jurado ? "jurados" : "mentores";
  const [abierto, setAbierto] = useState<string | null>(null);
  const actual = items.find((m) => m.id === abierto);   // siempre la versión más reciente del documento
  async function exportar() {
    await descargarXlsx(`${nombreRol}-${EDICION}.xlsx`, [
      ["Nombre", "Correo", "Teléfono", "Ocupación", "Perfil", "Años de experiencia", "Participó antes como", "Trayectoria", "Referencias", "Áreas", ...(jurado ? ["Disponibilidad"] : []), "Mensaje", "Estado", "Fecha"],
      ...items.map((m) => [m.nombre, m.correo, m.telefono, m.ocupacion, m.perfil, txt(aniosExperiencia, m.anios), lista(rolesPrevios, m.rolesPrevios), m.trayectoria ?? "", m.referencias ?? "",
        lista(areasMentor, m.areas), ...(jurado ? [txt(disponibilidades, m.disponibilidad)] : []), m.mensaje, m.estado, m.creadoEn ? m.creadoEn.toDate().toISOString() : ""]),
    ], jurado ? "Jurados" : "Mentores");
  }
  const ver = (m: ExpertoDoc) => <button type="button" className="adm-msg-more mt-0 whitespace-nowrap" onClick={() => setAbierto(m.id)}>Ver detalles</button>;
  const vacio = `Todavía no hay postulaciones de ${nombreRol}.`;
  return (
    <div>
      <div className="adm-bar"><span className="text-soft">{items.length} postulación(es)</span><button type="button" className="btn btn-ghost adm-btn" onClick={() => void exportar()}>Exportar XLSX</button></div>

      {/* Celular y tablet: tarjetas resumidas */}
      <ul className="adm-cards">
        {items.map((m) => (
          <li key={m.id} className="adm-card">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
              <b className="text-lg text-ink">{m.nombre}</b>
              <span className="text-[0.85rem] text-muted">{fecha(m.creadoEn)}</span>
            </div>
            <p className="text-soft">{m.ocupacion}</p>
            <p className="text-[0.95rem] text-muted">{experiencia(m) || "Sin datos de experiencia"}{jurado && m.disponibilidad ? ` · ${txt(disponibilidades, m.disponibilidad)}` : ""}</p>
            <div className="mt-2 flex items-center gap-4"><div className="min-w-0 flex-1"><EstadoExperto m={m} rol={rol} /></div>{ver(m)}</div>
          </li>
        ))}
        {!items.length && <li className="py-8 text-center text-soft">{vacio}</li>}
      </ul>

      {/* Escritorio: tabla */}
      <div className="adm-scroll adm-desk">
        <table className="adm-table">
          <thead><tr><th>Nombre</th><th>Ocupación</th><th>Experiencia</th><th>Áreas</th>{jurado && <th>Disponibilidad</th>}<th>Estado</th><th>Fecha</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td><b>{m.nombre}</b><br /><a href={`mailto:${m.correo}`} className="text-[0.9rem]">{m.correo}</a></td>
                <td>{m.ocupacion}</td>
                <td>{txt(aniosExperiencia, m.anios) || "—"}{m.rolesPrevios?.length ? <><br /><span className="text-muted">{lista(rolesPrevios, m.rolesPrevios)}</span></> : null}</td>
                <td>{lista(areasMentor, m.areas)}</td>
                {jurado && <td>{txt(disponibilidades, m.disponibilidad) || "—"}</td>}
                <td><EstadoExperto m={m} rol={rol} /></td>
                <td className="whitespace-nowrap">{fecha(m.creadoEn)}</td>
                <td>{ver(m)}</td>
              </tr>
            ))}
            {!items.length && <tr><td colSpan={jurado ? 8 : 7} className="py-8 text-center text-soft">{vacio}</td></tr>}
          </tbody>
        </table>
      </div>
      {actual && <FichaExperto m={actual} rol={rol} onClose={() => setAbierto(null)} />}
    </div>
  );
}

/* ---------- aviso por correo a los inscritos de una jornada ---------- */
function AvisoJornada({ ev, items, onClose, onDone }: { ev: Jornada & { id: string }; items: Inscripcion[]; onClose: () => void; onDone: (msg: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const base = useMemo(() => avisoBase(ev, eventos.findIndex((e) => e.id === ev.id) + 1), [ev]);
  const [asunto, setAsunto] = useState(base.subject);
  const [mensaje, setMensaje] = useState(base.message);
  const [conFlyer, setConFlyer] = useState(Boolean(ev.flyer));
  const [omitir, setOmitir] = useState(true);
  const [prueba, setPrueba] = useState("");
  const [estado, setEstado] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { ref.current?.showModal(); }, []);

  const clave = asunto.trim();
  // Una persona puede figurar dos veces si cambió de cuenta; se envía una vez por correo.
  const destinos = useMemo(() => {
    const vistos = new Set<string>();
    return items.filter((i) => {
      if (!i.correo || vistos.has(i.correo) || (omitir && i.avisos?.includes(clave))) return false;
      vistos.add(i.correo); return true;
    });
  }, [items, omitir, clave]);
  const yaAvisados = items.filter((i) => i.avisos?.includes(clave)).length;
  const listo = Boolean(clave && mensaje.trim()) && correoConfigurado && !busy;
  const flyer = conFlyer ? ev.flyer : undefined;

  async function probar() {
    if (!/^\S+@\S+\.\S+$/.test(prueba.trim())) { setEstado("Escribe un correo válido para la prueba."); return; }
    setBusy(true); setEstado("Enviando prueba…");
    const err = await enviarAviso({ correo: prueba.trim(), nombre: "Prueba" }, clave, mensaje, flyer);
    setEstado(err ? `No se pudo enviar la prueba: ${err}` : `Prueba enviada a ${prueba.trim()}. Revisa la bandeja (y spam).`);
    setBusy(false);
  }

  async function enviarTodos() {
    if (!db || !destinos.length) return;
    if (!window.confirm(destinos.length === 1 ? `¿Enviar el correo «${clave}» a ${destinos[0].correo}?` : `¿Enviar el correo «${clave}» a ${destinos.length} persona(s)?`)) return;
    const firestore = db;
    setBusy(true);
    let ok = 0; const fallos: string[] = [];
    for (const [n, i] of destinos.entries()) {
      setEstado(`Enviando… ${n + 1} de ${destinos.length}`);
      const err = await enviarAviso(i, clave, mensaje, flyer);
      if (err) fallos.push(`${i.correo} (${err})`);
      else { ok++; await updateDoc(doc(firestore, "inscripciones", i.id), { avisos: arrayUnion(clave) }).catch(() => undefined); }
      if (n < destinos.length - 1) await new Promise((r) => setTimeout(r, 700));   // el plan gratuito de EmailJS limita la velocidad
    }
    onDone(`Aviso «${clave}»: ${ok} correo(s) enviado(s)${fallos.length ? `. No se pudieron enviar ${fallos.length}: ${fallos.join("; ")}` : "."}`);
    setBusy(false);
    onClose();
  }

  return (
    <dialog ref={ref} className="ficha" aria-labelledby="av-t" onCancel={(e) => { if (busy) e.preventDefault(); }} onClose={onClose} onClick={(e) => { if (e.target === ref.current && !busy) onClose(); }}>
      <div className="ficha-box">
        <button type="button" className="auth-x" aria-label="Cerrar" disabled={busy} onClick={onClose}>×</button>
        <h2 id="av-t" className="title text-3xl">Correo a inscritos</h2>
        <p className="mt-2 text-ink">{ev.dia} {ev.mes} · {ev.tema}</p>
        <p className="mt-1 text-soft">{items.length === 1 ? <>Solo a <b className="text-ink">{items[0].nombre}</b> ({items[0].correo})</> : `A todos los inscritos de la jornada (${items.length})`}</p>
        {!correoConfigurado && <p className="err mt-4">Los correos no están configurados (EmailJS). Mira docs/firebase-setup.md.</p>}

        <div className="mt-6 grid gap-5">
          <div className="field">
            <label htmlFor="av-asunto">Asunto</label>
            <input id="av-asunto" className="adm-input" value={asunto} maxLength={150} disabled={busy} onChange={(e) => setAsunto(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="av-msg">Mensaje</label>
            <p className="hint" id="av-hint">{"{nombre}"} se cambia por el primer nombre de cada persona. Los enlaces quedan clicables. La firma y el contacto se agregan solos.</p>
            <textarea id="av-msg" className="area" rows={12} aria-describedby="av-hint" value={mensaje} disabled={busy} onChange={(e) => setMensaje(e.target.value)} />
          </div>
          {ev.flyer && (
            <div className="grid gap-2">
              <label className="check"><input type="checkbox" checked={conFlyer} disabled={busy} onChange={(e) => setConFlyer(e.target.checked)} /><span>Incluir el flyer al inicio del correo</span></label>
              {conFlyer && <img src={ev.flyer} alt="Flyer que se incluirá" className="w-32 rounded-md" />}
              {conFlyer && <p className="text-[0.9rem] text-muted">La imagen se carga desde el sitio publicado: debe estar desplegada para que se vea en el correo.</p>}
            </div>
          )}
          <label className="check"><input type="checkbox" checked={omitir} disabled={busy} onChange={(e) => setOmitir(e.target.checked)} /><span>No reenviar a quienes ya recibieron un correo con este asunto{yaAvisados ? ` (${yaAvisados})` : ""}</span></label>
        </div>

        <details className="mt-5">
          <summary className="cursor-pointer font-bold text-ink">Vista previa (primera persona)</summary>
          <p className="mt-2 whitespace-pre-wrap text-soft">{personalizar(mensaje, destinos[0]?.nombre ?? items[0]?.nombre ?? "")}</p>
        </details>

        <div className="mt-6 grid gap-2">
          <label htmlFor="av-prueba" className="font-bold text-ink">Enviarme una prueba primero</label>
          <div className="flex flex-wrap gap-3">
            <input id="av-prueba" type="email" className="adm-input min-w-0 flex-1" placeholder="tu-correo@ejemplo.com" value={prueba} disabled={busy} onChange={(e) => setPrueba(e.target.value)} />
            <button type="button" className="btn btn-ghost adm-btn" disabled={!listo || !prueba.trim()} onClick={() => void probar()}>Enviar prueba</button>
          </div>
        </div>

        {estado && <p role="status" className="mt-4 text-soft">{estado}</p>}
        <p className="mt-4 text-[0.9rem] text-muted">Se enviará un correo por persona: {destinos.length}. El plan gratuito de EmailJS permite 200 correos al mes en total.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn" disabled={!listo || !destinos.length} onClick={() => void enviarTodos()}>{busy ? "Enviando…" : destinos.length === 1 && items.length === 1 ? `Enviar a ${destinos[0].correo}` : `Enviar a ${destinos.length} inscrito(s)`}</button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- inscripciones a las jornadas virtuales ---------- */
function Jornadas({ items }: { items: Inscripcion[] }) {
  const [ev, setEv] = useState("todas");
  const [aviso, setAviso] = useState<Inscripcion[] | null>(null);
  const [msg, setMsg] = useState("");
  const todas = ev === "todas";
  const jornada = eventos.find((e) => e.id === ev);
  const lista = items.filter((i) => i.evento === ev);
  const nombreEv = (id: string) => eventos.find((e) => e.id === id)?.tema ?? id;
  const corto = (e: (typeof eventos)[number]) => `${e.dia} ${e.mes}`;
  // «Todas»: una fila por cuenta, con las jornadas a las que se inscribió.
  const personas = useMemo(() => {
    const m = new Map<string, { uid: string; nombre: string; correo: string; ev: Set<string> }>();
    for (const i of items) {
      const p = m.get(i.uid) ?? { uid: i.uid, nombre: i.nombre, correo: i.correo, ev: new Set<string>() };
      p.ev.add(i.evento); m.set(i.uid, p);
    }
    return [...m.values()].sort((a, b) => b.ev.size - a.ev.size || a.nombre.localeCompare(b.nombre, "es"));
  }, [items]);
  const correos = todas ? personas.map((p) => p.correo) : lista.map((i) => i.correo);
  async function exportar() {
    if (todas) {
      await descargarXlsx(`inscritos-todas.xlsx`, [["Nombre", "Correo", ...eventos.map((e) => `${corto(e)} · ${e.tema}`), "Total"],
        ...personas.map((p) => [p.nombre, p.correo, ...eventos.map((e) => (p.ev.has(e.id) ? "Sí" : "No")), p.ev.size])], "Inscritos");
    } else {
      await descargarXlsx(`inscritos-${ev}.xlsx`, [["Jornada", "Nombre", "Correo", "Fecha de inscripción"], ...lista.map((i) => [nombreEv(i.evento), i.nombre, i.correo, i.creadoEn ? i.creadoEn.toDate().toISOString() : ""])], "Inscritos");
    }
  }
  return (
    <div>
      <div className="adm-kpis" role="group" aria-label="Inscritos por jornada">
        {eventos.map((e) => <div key={e.id}><b>{items.filter((i) => i.evento === e.id).length}</b><span>{e.dia} {e.mes} · {e.tema}</span></div>)}
      </div>
      <div className="adm-bar">
        <select className="adm-input" aria-label="Jornada" value={ev} onChange={(e) => setEv(e.target.value)}>
          <option value="todas">Todas las jornadas</option>
          {eventos.map((e) => <option key={e.id} value={e.id}>{e.dia} {e.mes} · {e.tema}</option>)}
        </select>
        <span className="text-soft">{todas ? `${personas.length} persona(s)` : `${lista.length} inscrito(s)`}</span>
        <button type="button" className="btn btn-ghost adm-btn" onClick={() => void exportar()}>Exportar XLSX</button>
        <button type="button" className="btn btn-ghost adm-btn" onClick={() => void navigator.clipboard.writeText(correos.join(", "))}>Copiar correos</button>
        {jornada && <button type="button" className="btn adm-btn" disabled={!lista.length} title={lista.length ? undefined : "Esta jornada no tiene inscritos."} onClick={() => setAviso(lista)}>Enviar correo a todos los inscritos</button>}
        {todas && <span className="text-[0.9rem] text-muted">Elige una jornada para enviar un correo a sus inscritos.</span>}
      </div>
      {msg && <p role="status" className="mb-3 text-ink">{msg}</p>}
      <div className="adm-scroll">
        {todas ? (
          <table className="adm-table adm-table-jor">
            <thead><tr><th>Nombre</th><th>Correo</th>{eventos.map((e) => <th key={e.id} className="c" title={e.tema}>{corto(e)}</th>)}<th className="c">Total</th></tr></thead>
            <tbody>
              {personas.map((p) => (
                <tr key={p.uid}>
                  <td>{p.nombre}</td>
                  <td>{p.correo}</td>
                  {eventos.map((e) => {
                    const on = p.ev.has(e.id);
                    return <td key={e.id} className="c"><span className={on ? "jor-dot on" : "jor-dot"} title={`${corto(e)} · ${e.tema}: ${on ? "inscrito" : "no inscrito"}`} /><span className="sr-only">{on ? "Inscrito" : "No inscrito"}</span></td>;
                  })}
                  <td className="c font-bold">{p.ev.size}/{eventos.length}</td>
                </tr>
              ))}
              {!personas.length && <tr><td colSpan={eventos.length + 3} className="py-8 text-center text-soft">Todavía no hay inscritos.</td></tr>}
            </tbody>
          </table>
        ) : (
          <table className="adm-table">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Inscrito</th><th>Correos recibidos</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {lista.map((i) => <tr key={i.id}><td>{i.nombre}</td><td>{i.correo}</td><td>{fecha(i.creadoEn)}</td><td className="text-[0.9rem] text-muted">{i.avisos?.length ? i.avisos.join(" · ") : "—"}</td><td><button type="button" className="btn btn-ghost adm-btn whitespace-nowrap" aria-label={`Enviar correo solo a ${i.nombre}`} onClick={() => setAviso([i])}>Enviar</button></td></tr>)}
              {!lista.length && <tr><td colSpan={5} className="py-8 text-center text-soft">Todavía no hay inscritos en esta jornada.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
      {aviso && jornada && <AvisoJornada ev={jornada} items={aviso} onClose={() => setAviso(null)} onDone={setMsg} />}
    </div>
  );
}

/* ---------- acceso: solo la contraseña de administrador ---------- */
function Login() {
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const err = await entrarAdmin(pass);
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
  const { user, loading } = useAdminSession();
  const [tab, setTab] = useState<"post" | "spon" | "men" | "jur" | "ev">("post");
  const [insc, setInsc] = useState<Inscripcion[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [spons, setSpons] = useState<SponsorDoc[]>([]);
  const [mentores, setMentores] = useState<ExpertoDoc[]>([]);
  const [jurados, setJurados] = useState<ExpertoDoc[]>([]);
  const [error, setError] = useState("");
  // Esto solo decide qué se muestra; quien protege los datos son las reglas de Firestore.
  const isAdmin = Boolean(user);

  useEffect(() => {
    if (!isAdmin || !db) return;
    const u1 = onSnapshot(query(collection(db, "postulaciones"), orderBy("creadoEn", "desc")),
      (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, "id">) }))), () => setError("No se pudieron cargar las postulaciones."));
    const u2 = onSnapshot(query(collection(db, "sponsors"), orderBy("creadoEn", "desc")),
      (s) => setSpons(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SponsorDoc, "id">) }))), () => setError("No se pudieron cargar los sponsors."));
    const u3 = onSnapshot(query(collection(db, "inscripciones"), orderBy("creadoEn", "desc")),
      (s) => setInsc(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Inscripcion, "id">) }))), () => setError("No se pudieron cargar las inscripciones."));
    const u4 = onSnapshot(query(collection(db, "mentores"), orderBy("creadoEn", "desc")),
      (s) => setMentores(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpertoDoc, "id">) }))), () => setError("No se pudieron cargar los mentores."));
    const u5 = onSnapshot(query(collection(db, "jurados"), orderBy("creadoEn", "desc")),
      (s) => setJurados(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ExpertoDoc, "id">) }))), () => setError("No se pudieron cargar los jurados."));
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [isAdmin]);

  let body;
  if (!firebaseConfigured) body = <p className="text-xl text-ink">Falta configurar Firebase (ver docs/firebase-setup.md).</p>;
  else if (loading) body = <p role="status" className="text-xl text-ink">Cargando…</p>;
  else if (!isAdmin) body = <Login />;
  else body = (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <h1 className="title h-lg">Panel de administración</h1>
        <button type="button" className="link-btn link-danger" onClick={() => void salirAdmin()}>Salir del panel</button>
      </div>
      <div className="adm-tabs" role="tablist" aria-label="Secciones">
        <button role="tab" aria-selected={tab === "post"} onClick={() => setTab("post")}>Postulaciones ({posts.length})</button>
        <button role="tab" aria-selected={tab === "spon"} onClick={() => setTab("spon")}>Sponsors ({spons.length})</button>
        <button role="tab" aria-selected={tab === "men"} onClick={() => setTab("men")}>Mentores ({mentores.length})</button>
        <button role="tab" aria-selected={tab === "jur"} onClick={() => setTab("jur")}>Jurados ({jurados.length})</button>
        <button role="tab" aria-selected={tab === "ev"} onClick={() => setTab("ev")}>Jornadas ({insc.length})</button>
      </div>
      {error && <p className="err mb-4" role="alert">{error}</p>}
      <div className="mt-6">{tab === "post" ? <Postulaciones posts={posts} /> : tab === "spon" ? <Sponsors items={spons} /> : tab === "men" ? <Expertos key="men" rol="mentor" items={mentores} /> : tab === "jur" ? <Expertos key="jur" rol="jurado" items={jurados} /> : <Jornadas items={insc} />}</div>
    </>
  );

  return <Shell><div className="wrap py-10 md:py-14">{body}</div></Shell>;
}
