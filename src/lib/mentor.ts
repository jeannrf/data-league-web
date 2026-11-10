import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { EDICION } from "../config";

export const areasMentor = [
  { v: "storytelling", t: "Data storytelling y visualización" },
  { v: "ml", t: "Machine learning" },
  { v: "ia", t: "IA aplicada y MVP" },
  { v: "gobierno", t: "Gobierno de datos" },
  { v: "negocio", t: "Negocio y presentación (pitch)" },
  { v: "otro", t: "Otra" },
] as const;

export const mentorSchema = z.object({
  nombre: z.string().trim().min(1, "Escribe tu nombre.").max(100, "Máximo 100 caracteres."),
  correo: z.string().trim().toLowerCase().min(1, "Escribe un correo.").email("Revisa el correo: debe tener la forma nombre@dominio.com."),
  telefono: z.string().trim().max(20, "Máximo 20 caracteres.").optional(),
  ocupacion: z.string().trim().min(1, "Cuéntanos a qué te dedicas y dónde.").max(120, "Máximo 120 caracteres."),
  perfil: z.string().trim().max(200, "Máximo 200 caracteres.").optional(),
  areas: z.array(z.string()).min(1, "Elige al menos un área."),
  mensaje: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
  web: z.string().max(0).optional(),   // campo trampa para bots: las personas lo dejan vacío
  consentimientoDatos: z.literal(true, { message: "Necesitamos tu consentimiento para contactarte." }),
});

export type MentorForm = z.input<typeof mentorSchema>;
export type MentorData = z.output<typeof mentorSchema>;

export async function enviarMentor(v: MentorData) {
  if (!db) throw new Error("Firebase no está configurado.");
  if (v.web) return;   // bot: se ignora sin avisar
  await addDoc(collection(db, "mentores"), {
    edicion: EDICION, estado: "nuevo",
    nombre: v.nombre, correo: v.correo, telefono: v.telefono ?? "", ocupacion: v.ocupacion,
    perfil: v.perfil ?? "", areas: v.areas, mensaje: v.mensaje ?? "",
    consentimientoDatos: true, creadoEn: serverTimestamp(),
  });
}
