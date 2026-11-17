import { useEffect, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where, type Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import type { Jornada } from "../config";

export type Inscripcion = { id: string; evento: string; uid: string; nombre: string; correo: string; creadoEn?: Timestamp };

export const inscripcionId = (evento: string, uid: string) => `${evento}_${uid}`;

/** El nombre sale de la cuenta de Google; si no lo tiene, de la parte inicial del correo. */
export const nombreDe = (u: User) => (u.displayName?.trim() || (u.email ?? "").split("@")[0]).slice(0, 100);

export async function inscribirse(user: User, evento: string) {
  if (!db) throw new Error("Firebase no está configurado.");
  await setDoc(doc(db, "inscripciones", inscripcionId(evento, user.uid)), {
    evento, uid: user.uid, nombre: nombreDe(user), correo: (user.email ?? "").toLowerCase(), creadoEn: serverTimestamp(),
  });
}

export async function cancelarInscripcion(user: User, evento: string) {
  if (!db) return;
  await deleteDoc(doc(db, "inscripciones", inscripcionId(evento, user.uid)));
}

/** Eventos en los que está inscrita la persona (se actualiza en vivo). */
export function useMisInscripciones(uid: string | undefined) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(Boolean(uid));
  useEffect(() => {
    if (!uid || !db) { setIds(new Set()); setLoading(false); return; }
    setLoading(true);
    return onSnapshot(query(collection(db, "inscripciones"), where("uid", "==", uid)),
      (s) => { setIds(new Set(s.docs.map((d) => d.data().evento as string))); setLoading(false); },
      () => setLoading(false));
  }, [uid]);
  return { ids, loading };
}

/** El día ya pasó (hora de Perú), así que ya no se puede uno inscribir. */
export const yaPaso = (j: Jornada) => Date.now() > new Date(`${j.fecha}T23:59:59-05:00`).getTime();
