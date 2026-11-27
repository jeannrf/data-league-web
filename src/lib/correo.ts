import type { Post } from "./admin";
import type { Jornada } from "../config";

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

/** Texto plano a HTML seguro: escapa caracteres especiales (la nota la escribe el admin) y convierte saltos de línea. */
const aHtml = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/\n/g, "<br>");

/** Envía un correo con EmailJS (texto plano y su versión HTML). Devuelve null si salió bien, o el motivo del error. */
async function enviar(to_email: string, to_name: string, subject: string, message: string, message_html: string): Promise<string | null> {
  if (!correoConfigurado) return "Falta configurar EmailJS.";
  try {
    const r = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: SERVICE, template_id: TEMPLATE, user_id: KEY,
        // message_html: para la plantilla HTML de EmailJS ({{{message_html}}}).
        template_params: { to_email, to_name, subject, message, message_html, reply_to: CONTACTO ?? "" },
      }),
    });
    if (r.ok) return null;
    const t = await r.text();
    return t.slice(0, 120) || `Error ${r.status}`;
  } catch { return "Sin conexión."; }
}

/** Envía el correo de cambio de estado de una postulación. */
export async function enviarCorreoEstado(p: Post, estado: EstadoConCorreo, nota: string): Promise<string | null> {
  const { subject, message } = redactar(p, estado, nota);
  return enviar(p.correo, p.nombre, subject, message, aHtml(message));
}

/* ---------- avisos a quienes se inscribieron en una jornada ---------- */

/** Dirección pública del sitio: las imágenes del correo deben salir de aquí (una de localhost no carga en el correo). */
export const SITIO = "https://data-league-2026.web.app";

const fechaLarga = (j: Jornada) => {
  const f = new Date(`${j.fecha}T12:00:00-05:00`).toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
  return f.charAt(0).toUpperCase() + f.slice(1);
};

/** Borrador del aviso con los datos de la jornada. El admin lo edita antes de enviar; {nombre} se cambia por el nombre de cada persona. */
export function avisoBase(j: Jornada, n?: number) {
  const lineas = [
    `📅 ${fechaLarga(j)}`,
    j.hora ? `🕖 ${j.hora} (hora Perú)` : "",
    "💻 Virtual",
    j.enlace ? `👉 ${j.enlace}` : "",
  ].filter(Boolean).join("\n");
  return {
    subject: `${n ? `Taller ${n} – ` : ""}${j.tema} | Data League 2026`,
    message: `Hola {nombre},\n\nTe escribimos porque te inscribiste en la jornada «${j.tema}» de Data League 2026.${j.descripcion ? `\n\n${j.descripcion}` : ""}\n\n${lineas}\n\n¡Te esperamos!`,
  };
}

const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] || "";
export const personalizar = (t: string, nombre: string) => t.replaceAll("{nombre}", primerNombre(nombre)).replace(/^Hola ,/, "Hola,");

/** Texto del admin a HTML: escapa, vuelve clicables los enlaces y, si hay flyer, lo pone arriba. */
function avisoHtml(texto: string, flyer?: string) {
  const cuerpo = aHtml(texto).replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}">${u}</a>`);
  const img = flyer ? `<p><img src="${SITIO}${flyer}" alt="Flyer de la jornada" width="480" style="max-width:100%;height:auto;border-radius:8px"></p>` : "";
  return img + cuerpo;
}

/** Envía el aviso de una jornada a una persona. Devuelve null si salió bien, o el motivo del error. */
export async function enviarAviso(to: { correo: string; nombre: string }, subject: string, mensaje: string, flyer?: string): Promise<string | null> {
  const contacto = CONTACTO ? `\n\nSi tienes dudas, escríbenos a ${CONTACTO} o responde este correo.` : "\n\nSi tienes dudas, responde este correo.";
  const message = `${personalizar(mensaje.trim(), to.nombre)}${contacto}\n\nEquipo Data League\nAprende. Demuestra. Conecta.`;
  return enviar(to.correo, to.nombre, subject.trim(), message, avisoHtml(message, flyer));
}
