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

/** Archivo .ics de día completo, para añadir la jornada al calendario. */
export function descargarIcs(j: Jornada) {
  const d = j.fecha.replace(/-/g, "");
  const sig = new Date(`${j.fecha}T12:00:00Z`); sig.setUTCDate(sig.getUTCDate() + 1);
  const fin = sig.toISOString().slice(0, 10).replace(/-/g, "");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Data League//ES", "BEGIN:VEVENT", `UID:${j.id ?? d}@data-league-2026`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${fin}`, `SUMMARY:Data League · ${j.tema}`, "DESCRIPTION:Jornada virtual de Data League 2026. La hora y el enlace se confirman en la web.", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `data-league-${j.id ?? d}.ics`; a.click();
  URL.revokeObjectURL(url);
}
