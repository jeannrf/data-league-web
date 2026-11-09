import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
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

export async function existePostulacion(uid: string) {
  if (!db) return false;
  return (await getDoc(doc(db, "postulaciones", uid))).exists();
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
  if (equipo) data.integrantes = integrantes;

  const indices = [{ correo: email, rol: equipo ? "lider" : "individual" }, ...integrantes.map((m) => ({ correo: m.correo, rol: "integrante" }))];
  await runTransaction(firestore, async (tx) => {
    for (const i of indices) {
      const snap = await tx.get(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`));
      if (snap.exists()) throw new CorreoRepetido(i.correo);
    }
    tx.set(doc(firestore, "postulaciones", user.uid), data);
    for (const i of indices) tx.set(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`), { uid: user.uid, rol: i.rol });
  });
}
