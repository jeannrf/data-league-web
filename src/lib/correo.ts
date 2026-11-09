import type { Post } from "./admin";

const SERVICE = import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined;
const TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined;
const CONTACTO = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

/** true si están las tres claves de EmailJS (ver docs/firebase-setup.md). */
export const correoConfigurado = Boolean(SERVICE && TEMPLATE && KEY);

export type EstadoConCorreo = "aprobada" | "observada" | "rechazada";
export const tieneCorreo = (e: string): e is EstadoConCorreo => e === "aprobada" || e === "observada" || e === "rechazada";

const equipoTxt = (p: Post) => (p.modo === "equipo" ? " con tu equipo" : "");

/** Texto del correo según el nuevo estado. Texto plano: la plantilla de EmailJS lo imprime tal cual. */
export function redactar(p: Post, estado: EstadoConCorreo, nota: string) {
  const hola = `Hola ${p.nombre.split(" ")[0]},`;
  const extra = nota.trim() ? `\n\nMensaje del equipo organizador:\n${nota.trim()}` : "";
  const contacto = CONTACTO ? `\n\nSi tienes dudas, escríbenos a ${CONTACTO} o responde este correo.` : "\n\nSi tienes dudas, responde este correo.";
  const firma = "\n\nEquipo Data League\nAprende. Demuestra. Conecta.";
  if (estado === "aprobada") return {
    subject: "Tu postulación a Data League fue aprobada",
    message: `${hola}\n\n¡Buenas noticias! Tu postulación a Data League 2026${equipoTxt(p)} fue aprobada. Te contaremos los siguientes pasos por este medio.${extra}${contacto}${firma}`,
  };
  if (estado === "observada") return {
    subject: "Tu postulación a Data League tiene observaciones",
    message: `${hola}\n\nRevisamos tu postulación a Data League 2026${equipoTxt(p)} y tiene observaciones: hay datos por revisar o corregir antes de poder aprobarla.${extra}${contacto}${firma}`,
  };
  return {
    subject: "Resultado de tu postulación a Data League",
    message: `${hola}\n\nGracias por postular a Data League 2026${equipoTxt(p)}. En esta ocasión tu postulación no fue aprobada.${extra}${contacto}${firma}`,
  };
}

/** Envía un correo con EmailJS. Devuelve null si salió bien, o el motivo del error. */
export async function enviarCorreoEstado(p: Post, estado: EstadoConCorreo, nota: string): Promise<string | null> {
  if (!correoConfigurado) return "Falta configurar EmailJS.";
  const { subject, message } = redactar(p, estado, nota);
  try {
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: SERVICE, template_id: TEMPLATE, user_id: KEY,
        template_params: { to_email: p.correo, to_name: p.nombre, subject, message, reply_to: CONTACTO ?? "" },
      }),
    });
    if (r.ok) return null;
    const t = await r.text();
    return t.slice(0, 120) || `Error ${r.status}`;
  } catch { return "Sin conexión."; }
}
