import { z } from "zod";
import { doc, getDoc, runTransaction, serverTimestamp, Timestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "./firebase";
import { EDICION, FECHA_LIMITE, POSTULACION_ABIERTA, tracks } from "../config";

export const VERSION_TEXTOS_LEGALES = "2026-11-08";

export const prefijos = [
  { v: "+51", t: "Perú +51" }, { v: "+54", t: "Argentina +54" }, { v: "+56", t: "Chile +56" },
  { v: "+57", t: "Colombia +57" }, { v: "+593", t: "Ecuador +593" }, { v: "+591", t: "Bolivia +591" },
  { v: "+52", t: "México +52" }, { v: "+34", t: "España +34" }, { v: "+1", t: "EE. UU. / Canadá +1" },
];
export const areas = ["Salud", "Deporte", "Educación", "Economía", "Ambiente", "Cultura", "Tecnología", "Otra"];
export const comoSeEntero = ["Instagram", "Facebook", "LinkedIn", "TikTok", "WhatsApp", "Mi universidad o instituto", "Una comunidad aliada", "Un amigo o compañero", "Otro"];
export const instituciones = [
  "Universidad Nacional de Ingeniería (UNI)", "Universidad Nacional Mayor de San Marcos (UNMSM)", "Universidad Nacional Agraria La Molina (UNALM)",
  "Pontificia Universidad Católica del Perú (PUCP)", "Universidad de Lima", "Universidad Peruana de Ciencias Aplicadas (UPC)",
  "Universidad Nacional Federico Villarreal (UNFV)", "Universidad Peruana Cayetano Heredia (UPCH)", "Universidad de San Martín de Porres (USMP)",
  "Universidad Tecnológica del Perú (UTP)", "Universidad Ricardo Palma (URP)", "Universidad San Ignacio de Loyola (USIL)",
  "SENATI", "TECSUP", "Cibertec", "IDAT",
];

const textoCorto = (campo: string, max = 80) => z.string().trim().min(1, `Escribe ${campo}.`).max(max, `Máximo ${max} caracteres.`);
const correo = z.string().trim().toLowerCase().min(1, "Escribe un correo.").email("Revisa el correo: debe tener la forma nombre@dominio.com.");

export const miembroSchema = z.object({
  nombres: textoCorto("los nombres"),
  apellidos: textoCorto("los apellidos"),
  correo,
  prefijo: z.string(),
  whatsapp: z.string().min(1, "Escribe el WhatsApp."),
});

const edad = (iso: string) => {
  const nac = new Date(`${iso}T12:00:00`);
  const hoy = new Date();
  let a = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) a--;
  return a;
};

export const postulacionSchema = z.object({
  modo: z.enum(["equipo", "individual"], { message: "Elige cómo quieres postular." }),
  correoLider: z.string(),
  nombres: textoCorto("tus nombres"),
  apellidos: textoCorto("tus apellidos"),
  tipoDocumento: z.enum(["DNI", "CE", "PASAPORTE"]),
  numeroDocumento: z.string().trim().min(1, "Escribe tu número de documento."),
  prefijo: z.string(),
  whatsapp: z.string().min(1, "Escribe tu WhatsApp."),
  fechaNacimiento: z.string().min(1, "Indica tu fecha de nacimiento.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "La fecha no es válida.")
    .refine((v) => edad(v) >= 18, "Debes tener 18 años o más para postular.")
    .refine((v) => edad(v) < 100, "Revisa el año de nacimiento."),
  tipoInstitucion: z.enum(["universidad", "instituto"], { message: "Elige universidad o instituto." }),
  institucion: textoCorto("tu institución", 120),
  carrera: textoCorto("tu carrera", 120),
  ciclo: z.coerce.number({ message: "Elige tu ciclo." }).int().min(1, "Elige tu ciclo.").max(12),
  nivelDatos: z.enum(["ninguno", "basico", "intermedio", "avanzado"], { message: "Elige tu nivel." }),
  areasInteres: z.array(z.string()).min(1, "Elige al menos un área de interés."),
  comoSeEntero: z.string().min(1, "Cuéntanos cómo te enteraste."),
  track: z.enum(tracks.map((t) => t.id) as [string, ...string[]], { message: "Elige un track." }),
  nombreEquipo: z.string().trim().max(60).optional(),
  integrantes: z.array(miembroSchema).max(3),
  pideEquipo: z.enum(["si", "no"]).optional(),
  declaracionRequisitos: z.literal(true, { message: "Necesitamos esta declaración para continuar." }),
  consentimientoDatos: z.literal(true, { message: "Necesitamos tu consentimiento para tratar los datos." }),
  aceptaBases: z.literal(true, { message: "Debes aceptar las bases para postular." }),
}).superRefine((v, ctx) => {
  for (const i of crossIssues(v)) ctx.addIssue({ code: "custom", path: i.path, message: i.message });
});

type Issue = { path: (string | number)[]; message: string };

/**
 * Reglas que cruzan varios campos (formato del WhatsApp según el prefijo, del documento según el tipo,
 * tamaño del equipo, correos repetidos). Se usan en el esquema y también paso a paso, porque Zod no
 * ejecuta las reglas cruzadas mientras haya campos de otros pasos todavía vacíos.
 */
export function crossIssues(v: Partial<PostulacionForm>): Issue[] {
  const out: Issue[] = [];
  const digits = (v.whatsapp ?? "").replace(/[\s-]/g, "");
  if (v.whatsapp && !(v.prefijo === "+51" ? /^9\d{8}$/.test(digits) : /^\d{6,12}$/.test(digits)))
    out.push({ path: ["whatsapp"], message: v.prefijo === "+51" ? "En Perú el WhatsApp tiene 9 dígitos y empieza con 9." : "Escribe solo los dígitos del número (6 a 12)." });
  const doc = (v.numeroDocumento ?? "").trim();
  if (doc) {
    const okDoc = v.tipoDocumento === "DNI" ? /^\d{8}$/.test(doc) : v.tipoDocumento === "CE" ? /^[A-Za-z0-9]{9,12}$/.test(doc) : /^[A-Za-z0-9]{6,12}$/.test(doc);
    if (!okDoc) out.push({ path: ["numeroDocumento"], message: v.tipoDocumento === "DNI" ? "El DNI tiene 8 dígitos." : v.tipoDocumento === "CE" ? "El carné de extranjería tiene de 9 a 12 caracteres." : "El pasaporte tiene de 6 a 12 caracteres." });
  }
  if (v.modo === "equipo") {
    if (!v.nombreEquipo?.trim()) out.push({ path: ["nombreEquipo"], message: "Ponle un nombre a tu equipo." });
    const ints = v.integrantes ?? [];
    if (ints.length < 1) out.push({ path: ["integrantes"], message: "Agrega al menos una persona más: el equipo es de 2 a 4." });
    const vistos = new Set([(v.correoLider ?? "").toLowerCase()]);
    ints.forEach((m, i) => {
      const c = (m?.correo ?? "").trim().toLowerCase();
      if (c && vistos.has(c)) out.push({ path: ["integrantes", i, "correo"], message: "Este correo ya está en tu equipo. Cada persona necesita uno distinto." });
      vistos.add(c);
      const d = (m?.whatsapp ?? "").replace(/[\s-]/g, "");
      if (m?.whatsapp && !(m.prefijo === "+51" ? /^9\d{8}$/.test(d) : /^\d{6,12}$/.test(d)))
        out.push({ path: ["integrantes", i, "whatsapp"], message: m.prefijo === "+51" ? "En Perú el WhatsApp tiene 9 dígitos y empieza con 9." : "Escribe solo los dígitos del número (6 a 12)." });
    });
  } else if (v.modo === "individual" && !v.pideEquipo) {
    out.push({ path: ["pideEquipo"], message: "Indica si quieres que te asignemos un equipo." });
  }
  return out;
}

export type PostulacionForm = z.input<typeof postulacionSchema>;
export type PostulacionData = z.output<typeof postulacionSchema>;

export const postulacionCerrada = () => !POSTULACION_ABIERTA || Date.now() > FECHA_LIMITE.getTime();

const e164 = (prefijo: string, n: string) => prefijo + n.replace(/[\s-]/g, "");

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
  const equipo = v.modo === "equipo";
  const integrantes = equipo ? v.integrantes.map((m) => ({ nombres: m.nombres, apellidos: m.apellidos, correo: m.correo, whatsapp: e164(m.prefijo, m.whatsapp) })) : [];
  const data: Record<string, unknown> = {
    edicion: EDICION, uid: user.uid, modo: v.modo, track: v.track, estado: "registrada",
    nombres: v.nombres, apellidos: v.apellidos, tipoDocumento: v.tipoDocumento, numeroDocumento: v.numeroDocumento.trim(),
    correo: email, whatsapp: e164(v.prefijo, v.whatsapp),
    fechaNacimiento: Timestamp.fromDate(new Date(`${v.fechaNacimiento}T12:00:00Z`)),
    tipoInstitucion: v.tipoInstitucion, institucion: v.institucion, carrera: v.carrera, ciclo: v.ciclo,
    nivelDatos: v.nivelDatos, areasInteres: v.areasInteres, comoSeEntero: v.comoSeEntero,
    declaracionRequisitos: true, consentimientoDatos: true, aceptaBases: true,
    versionTextosLegales: VERSION_TEXTOS_LEGALES,
    creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
  };
  if (equipo) { data.nombreEquipo = v.nombreEquipo; data.integrantes = integrantes; }
  else data.pideEquipo = v.pideEquipo === "si";

  const indices = [
    { correo: email, rol: equipo ? "lider" : "individual" },
    ...integrantes.map((m) => ({ correo: m.correo, rol: "integrante" })),
  ];

  await runTransaction(firestore, async (tx) => {
    for (const i of indices) {
      const snap = await tx.get(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`));
      if (snap.exists()) throw new CorreoRepetido(i.correo);
    }
    tx.set(doc(firestore, "postulaciones", user.uid), data);
    for (const i of indices) tx.set(doc(firestore, "correosEdicion", `${EDICION}_${i.correo}`), { uid: user.uid, rol: i.rol });
  });
}
