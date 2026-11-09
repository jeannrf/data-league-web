import { z } from "zod";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { EDICION, FECHA_LIMITE, POSTULACION_ABIERTA } from "../config";

export const VERSION_TEXTOS_LEGALES = "2026-11-08";

/** Celular: 9 dígitos que empiezan con 9 (Perú) o un número internacional con +código. Devuelve E.164 o null. */
export function normalizarCelular(v: string): string | null {
  const t = v.trim().replace(/[\s().-]/g, "");
  if (/^9\d{8}$/.test(t)) return `+51${t}`;
  if (/^\+51(9\d{8})$/.test(t)) return t;
  if (/^\+[1-9]\d{7,14}$/.test(t)) return t;
  return null;
}

const nombre = z.string().trim().min(1, "Escribe el nombre completo.").max(100, "Máximo 100 caracteres.");
const celular = z.string().trim().min(1, "Escribe el celular.").refine((v) => normalizarCelular(v) !== null, "Escribe 9 dígitos que empiecen con 9, o el número con su código de país (por ejemplo +57…).");
const correo = z.string().trim().toLowerCase().min(1, "Escribe el correo.").email("Revisa el correo: debe tener la forma nombre@dominio.com.");

export const integranteSchema = z.object({ nombre, celular, correo });

export const postulacionSchema = z.object({
  correoLider: z.string(),
  nombre,
  celular,
  integrantes: z.array(integranteSchema).max(3, "Un equipo tiene como máximo 4 personas contándote."),
  acepta: z.literal(true, { message: "Marca la casilla para poder enviar tu postulación." }),
}).superRefine((v, ctx) => {
  for (const i of crossIssues(v)) ctx.addIssue({ code: "custom", path: i.path, message: i.message });
});

export type PostulacionForm = z.input<typeof postulacionSchema>;
export type PostulacionData = z.output<typeof postulacionSchema>;
type Issue = { path: (string | number)[]; message: string };

/** Datos repetidos dentro del equipo: correos, y nombre o celular iguales a los de quien postula. */
export function crossIssues(v: Partial<PostulacionForm>): Issue[] {
  const out: Issue[] = [];
  const vistos = new Set([(v.correoLider ?? "").toLowerCase()]);
  const miNombre = (v.nombre ?? "").trim().toLowerCase();
  const miCelular = normalizarCelular(v.celular ?? "");
  (v.integrantes ?? []).forEach((m, i) => {
    // Evita que alguien repita sus propios datos en un integrante creyendo que son los suyos.
    if (miNombre && (m?.nombre ?? "").trim().toLowerCase() === miNombre)
      out.push({ path: ["integrantes", i, "nombre"], message: "Este es tu nombre. Aquí van los datos de otra persona de tu equipo." });
    if (miCelular && normalizarCelular(m?.celular ?? "") === miCelular)
      out.push({ path: ["integrantes", i, "celular"], message: "Este es tu celular. Aquí va el de otra persona de tu equipo." });
    const c = (m?.correo ?? "").trim().toLowerCase();
    if (c && vistos.has(c)) out.push({ path: ["integrantes", i, "correo"], message: "Este correo ya está en tu equipo. Cada persona necesita uno distinto." });
    vistos.add(c);
  });
  return out;
}

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
