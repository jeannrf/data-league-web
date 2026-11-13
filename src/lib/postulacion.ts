import { deleteField, doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { EDICION, FECHA_LIMITE, POSTULACION_ABIERTA } from "../config";

export const VERSION_TEXTOS_LEGALES = "2026-11-08";

export * from "./validacion";
import { normalizarCelular, type PostulacionData } from "./validacion";

export const postulacionCerrada = () => !POSTULACION_ABIERTA || Date.now() > FECHA_LIMITE.getTime();

export class CorreoRepetido extends Error {
  constructor(public correo: string) { super(correo); }
}

/** true si ya tiene una postulación vigente. Una retirada no cuenta: puede volver a postular. */
export async function existePostulacion(uid: string) {
  if (!db) return false;
  const s = await getDoc(doc(db, "postulaciones", uid));
  return s.exists() && s.data().estado !== "retirada";
}

/** Estados en los que quien postuló todavía puede editar sus datos (mientras siga abierto el plazo). */
export const esEditable = (estado: string) => estado === "registrada" || estado === "observada";

export class NoEditable extends Error {}

/** Datos guardados de una postulación, para rellenar el formulario al editarla. */
export type PostulacionGuardada = {
  estado: string; modo: "equipo" | "individual"; nombre: string; whatsapp: string; correo: string;
  nombreEquipo?: string; integrantes?: { nombre: string; correo: string; whatsapp: string }[];
};

export async function leerPostulacion(uid: string): Promise<PostulacionGuardada | null> {
  if (!db) return null;
  const s = await getDoc(doc(db, "postulaciones", uid));
  return s.exists() ? (s.data() as PostulacionGuardada) : null;
}

/**
 * Guarda los cambios de una postulación «Pendiente» o «En observación». En la misma transacción
 * reserva en el índice los correos nuevos (si nadie más los tiene) y libera los de quienes salieron del equipo.
 */
export async function editarPostulacion(user: User, v: PostulacionData) {
  if (!db) throw new Error("Firebase no está configurado.");
  const firestore = db;
  const email = (user.email ?? "").toLowerCase();
  const integrantes = v.integrantes.map((m) => ({ nombre: m.nombre, correo: m.correo, whatsapp: normalizarCelular(m.celular)! }));
  const equipo = integrantes.length > 0;
  const cambios: Record<string, unknown> = {
    modo: equipo ? "equipo" : "individual", nombre: v.nombre, whatsapp: normalizarCelular(v.celular)!,
    integrantes: equipo ? integrantes : deleteField(), nombreEquipo: equipo ? (v.nombreEquipo ?? "").trim() : deleteField(),
    actualizadoEn: serverTimestamp(), editadoEn: serverTimestamp(),
  };
  const indices = [{ correo: email, rol: equipo ? "lider" : "individual" }, ...integrantes.map((m) => ({ correo: m.correo, rol: "integrante" }))];
  const ref = doc(firestore, "postulaciones", user.uid);

  await runTransaction(firestore, async (tx) => {
    const actual = await tx.get(ref);
    if (!actual.exists() || !esEditable(actual.data().estado as string)) throw new NoEditable();
    for (const i of indices) {
      const snap = await tx.get(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`));
      if (snap.exists() && snap.data().uid !== user.uid) throw new CorreoRepetido(i.correo);
    }
    const nuevos = new Set(indices.map((i) => i.correo));
    const salieron: string[] = [];
    for (const c of ((actual.data().integrantes ?? []) as { correo: string }[]).map((m) => m.correo).filter((c) => !nuevos.has(c))) {
      const snap = await tx.get(doc(firestore, "correosEdicion", `${EDICION}_${c}`));
      if (snap.exists() && snap.data().uid === user.uid) salieron.push(c);   // solo se libera lo que es de esta postulación
    }
    tx.update(ref, cambios);
    for (const i of indices) tx.set(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`), { uid: user.uid, rol: i.rol });
    for (const c of salieron) tx.delete(doc(firestore, "correosEdicion", `${EDICION}_${c}`));
  });
}

export async function enviarPostulacion(user: User, v: PostulacionData) {
  if (!db) throw new Error("Firebase no está configurado.");
  const firestore = db;
  const email = (user.email ?? "").toLowerCase();
  const integrantes = v.integrantes.map((m) => ({ nombre: m.nombre, correo: m.correo, whatsapp: normalizarCelular(m.celular)! }));
  const equipo = integrantes.length > 0;
  const data: Record<string, unknown> = {
    edicion: EDICION, uid: user.uid, modo: equipo ? "equipo" : "individual", estado: "registrada",
    nombre: v.nombre, whatsapp: normalizarCelular(v.celular)!, correo: email,
    consentimiento: true, versionTextosLegales: VERSION_TEXTOS_LEGALES,
    creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
  };
  if (equipo) { data.integrantes = integrantes; data.nombreEquipo = (v.nombreEquipo ?? "").trim(); }

  const indices = [{ correo: email, rol: equipo ? "lider" : "individual" }, ...integrantes.map((m) => ({ correo: m.correo, rol: "integrante" }))];
  await runTransaction(firestore, async (tx) => {
    for (const i of indices) {
      const snap = await tx.get(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`));
      if (snap.exists() && snap.data().uid !== user.uid) throw new CorreoRepetido(i.correo);   // si es suyo, queda de una postulación retirada
    }
    tx.set(doc(firestore, "postulaciones", user.uid), data);
    for (const i of indices) tx.set(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`), { uid: user.uid, rol: i.rol });
  });
}
