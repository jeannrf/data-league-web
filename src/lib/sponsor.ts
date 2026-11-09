import { z } from "zod";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { EDICION } from "../config";

export const tiposApoyo = [
  { v: "economico", t: "Aporte económico" },
  { v: "premios", t: "Premios o productos" },
  { v: "difusion", t: "Difusión y comunidad" },
  { v: "mentoria", t: "Mentoría o jurado" },
  { v: "otro", t: "Otro" },
] as const;

export const sponsorSchema = z.object({
  organizacion: z.string().trim().min(1, "Escribe el nombre de tu empresa u organización.").max(120, "Máximo 120 caracteres."),
  contacto: z.string().trim().min(1, "Escribe el nombre de la persona de contacto.").max(100, "Máximo 100 caracteres."),
  cargo: z.string().trim().min(1, "Escribe tu cargo o rol.").max(80, "Máximo 80 caracteres."),
  correo: z.string().trim().toLowerCase().min(1, "Escribe un correo.").email("Revisa el correo: debe tener la forma nombre@dominio.com."),
  telefono: z.string().trim().max(20, "Máximo 20 caracteres.").optional(),
  tipoApoyo: z.array(z.string()).min(1, "Elige al menos una forma de apoyar."),
  mensaje: z.string().trim().max(1000, "Máximo 1000 caracteres.").optional(),
  web: z.string().max(0).optional(),   // campo trampa para bots: las personas lo dejan vacío
  consentimientoDatos: z.literal(true, { message: "Necesitamos tu consentimiento para contactarte." }),
});

export type SponsorForm = z.input<typeof sponsorSchema>;
export type SponsorData = z.output<typeof sponsorSchema>;

export async function enviarSponsor(v: SponsorData) {
  if (!db) throw new Error("Firebase no está configurado.");
  if (v.web) return;   // bot: se ignora sin avisar
  await addDoc(collection(db, "sponsors"), {
    edicion: EDICION, estado: "nuevo",
    organizacion: v.organizacion, contacto: v.contacto, cargo: v.cargo, correo: v.correo,
    telefono: v.telefono ?? "", tipoApoyo: v.tipoApoyo, mensaje: v.mensaje ?? "",
    consentimientoDatos: true, creadoEn: serverTimestamp(),
  });
}
