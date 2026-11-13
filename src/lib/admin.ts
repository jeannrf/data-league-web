import type { Timestamp } from "firebase/firestore";

export type Miembro = { nombre: string; correo: string; whatsapp: string };
export type Post = {
  id: string; edicion: string; uid: string; modo: "equipo" | "individual"; estado: string;
  nombre: string; correo: string; whatsapp: string; nombreEquipo?: string; integrantes?: Miembro[];
  creadoEn?: Timestamp; actualizadoEn?: Timestamp; editadoEn?: Timestamp;
  correoEstado?: string; correoEnviadoEn?: Timestamp;
};
export type SponsorDoc = {
  id: string; organizacion: string; contacto: string; cargo: string; correo: string; telefono: string;
  tipoApoyo: string[]; mensaje: string; estado: string; creadoEn?: Timestamp;
};
export type MentorDoc = {
  id: string; nombre: string; correo: string; telefono: string; ocupacion: string; perfil: string;
  areas: string[]; mensaje: string; estado: string; creadoEn?: Timestamp;
};

/** Estados que elige el administrador. «registrada» es el estado inicial del sistema y se muestra como «Pendiente». */
export const ESTADOS = [
  { v: "registrada", t: "Pendiente" }, { v: "aprobada", t: "Aprobada" }, { v: "observada", t: "En observación" }, { v: "rechazada", t: "Rechazada" },
] as const;
/** Se muestra pero no se elige: lo marca la propia persona al retirar su postulación. */
const OTROS = [{ v: "retirada", t: "Retirada" }, { v: "valida", t: "Aprobada" }, { v: "finalista", t: "Aprobada" }, { v: "no_seleccionada", t: "Rechazada" }] as const;
export const ESTADOS_SPONSOR = [
  { v: "nuevo", t: "Nuevo" }, { v: "contactado", t: "Contactado" }, { v: "confirmado", t: "Confirmado" }, { v: "descartado", t: "Descartado" },
] as const;
export const ESTADOS_MENTOR = [
  { v: "nuevo", t: "Nuevo" }, { v: "contactado", t: "Contactado" }, { v: "confirmado", t: "Confirmado" }, { v: "descartado", t: "Descartado" },
] as const;
export const estadoTexto = (v: string) => [...ESTADOS, ...OTROS].find((e) => e.v === v)?.t ?? v;

export const fecha = (t?: Timestamp) => (t ? t.toDate().toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/** Excel (.xlsx): primera fila en negrita y columnas con ancho según el contenido. La librería se carga solo al exportar. */
export async function descargarXlsx(nombre: string, filas: (string | number)[][], hoja = "Datos") {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const [cab, ...resto] = filas;
  const data = [
    cab.map((v) => ({ value: String(v), fontWeight: "bold" as const })),
    ...resto.map((f) => f.map((v) => (v === "" ? null : v))),
  ];
  const columns = cab.map((_, i) => ({ width: Math.min(40, Math.max(10, ...filas.map((f) => String(f[i] ?? "").length)) + 2) }));
  await writeXlsxFile(data, { columns, sheet: hoja }).toFile(nombre);
}

/** Una fila por persona: quien lidera (o postula solo) y cada integrante. */
export function filasPersonas(posts: Post[]): (string | number)[][] {
  const out: (string | number)[][] = [["Rol", "Nombre", "Correo", "WhatsApp", "Modo", "Nombre del equipo", "Equipo de", "Estado", "Fecha de registro"]];
  for (const p of posts) {
    const n = 1 + (p.integrantes?.length ?? 0);
    const fecha = p.creadoEn ? p.creadoEn.toDate().toISOString() : "";
    out.push([p.modo === "equipo" ? "Líder" : "Individual", p.nombre, p.correo, p.whatsapp, p.modo, p.nombreEquipo ?? "", n, estadoTexto(p.estado), fecha]);
    (p.integrantes ?? []).forEach((m) => out.push(["Integrante", m.nombre, m.correo, m.whatsapp, p.modo, p.nombreEquipo ?? "", n, estadoTexto(p.estado), ""]));
  }
  return out;
}
