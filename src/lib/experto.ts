import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { EDICION } from "../config";

/** Mentores y jurados comparten formulario; el jurado además indica su disponibilidad para la final. */
export type Rol = "mentor" | "jurado";
export const coleccion = { mentor: "mentores", jurado: "jurados" } as const;

export const areasMentor = [
  { v: "storytelling", t: "Data storytelling y visualización" },
  { v: "ml", t: "Machine learning" },
  { v: "ia", t: "IA aplicada y MVP" },
  { v: "gobierno", t: "Gobierno de datos" },
  { v: "negocio", t: "Negocio y presentación (pitch)" },
  { v: "otro", t: "Otra" },
] as const;

export const aniosExperiencia = [
  { v: "0-2", t: "Menos de 2 años" },
  { v: "2-5", t: "De 2 a 5 años" },
  { v: "5-10", t: "De 5 a 10 años" },
  { v: "10+", t: "Más de 10 años" },
] as const;

export const rolesPrevios = [
  { v: "mentor", t: "Mentor" },
  { v: "jurado", t: "Jurado" },
  { v: "ponente", t: "Ponente" },
  { v: "organizador", t: "Organizador" },
  { v: "docente", t: "Docente" },
  { v: "ninguno", t: "Es mi primera vez" },
] as const;

export const disponibilidades = [
  { v: "presencial", t: "Sí, puedo ir a la UNI" },
  { v: "virtual", t: "Solo de forma virtual" },
  { v: "por_confirmar", t: "Por confirmar" },
] as const;

const valores = <T extends readonly { v: string }[]>(l: T) => l.map((x) => x.v) as [T[number]["v"], ...T[number]["v"][]];

const base = {
  nombre: z.string().trim().min(1, "Escribe tu nombre.").max(100, "Máximo 100 caracteres."),
  correo: z.string().trim().toLowerCase().min(1, "Escribe un correo.").email("Revisa el correo: debe tener la forma nombre@dominio.com."),
  telefono: z.string().trim().max(20, "Máximo 20 caracteres.").optional(),
  ocupacion: z.string().trim().min(1, "Cuéntanos a qué te dedicas y dónde.").max(120, "Máximo 120 caracteres."),
  perfil: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  anios: z.enum(valores(aniosExperiencia), { message: "Elige tus años de experiencia." }),
  rolesPrevios: z.array(z.string()).min(1, "Elige al menos una opción."),
  trayectoria: z.string().trim().min(30, "Cuéntanos un poco más (mínimo 30 caracteres).").max(1500, "Máximo 1500 caracteres."),
  referencias: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
  areas: z.array(z.string()).min(1, "Elige al menos un área."),
  disponibilidad: z.string().optional(),
  mensaje: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
  web: z.string().max(0).optional(),   // campo trampa para bots: las personas lo dejan vacío
  consentimientoDatos: z.literal(true, { message: "Necesitamos tu consentimiento para contactarte." }),
};

export const expertoSchema = (rol: Rol) => z.object(base).superRefine((v, ctx) => {
  if (rol === "jurado" && !valores(disponibilidades).includes(v.disponibilidad as never))
    ctx.addIssue({ code: "custom", path: ["disponibilidad"], message: "Indícanos si puedes asistir a la final." });
});

export type ExpertoForm = z.input<ReturnType<typeof expertoSchema>>;
export type ExpertoData = z.output<ReturnType<typeof expertoSchema>>;

export async function enviarExperto(rol: Rol, v: ExpertoData) {
  if (!db) throw new Error("Firebase no está configurado.");
  if (v.web) return;   // bot: se ignora sin avisar
  await addDoc(collection(db, coleccion[rol]), {
    edicion: EDICION, estado: "nuevo",
    nombre: v.nombre, correo: v.correo, telefono: v.telefono ?? "", ocupacion: v.ocupacion, perfil: v.perfil ?? "",
    anios: v.anios, rolesPrevios: v.rolesPrevios, trayectoria: v.trayectoria, referencias: v.referencias ?? "",
    areas: v.areas, mensaje: v.mensaje ?? "",
    ...(rol === "jurado" ? { disponibilidad: v.disponibilidad } : {}),
    consentimientoDatos: true, creadoEn: serverTimestamp(),
  });
}
