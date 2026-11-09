import type { Timestamp } from "firebase/firestore";

export type Miembro = { nombre: string; correo: string; whatsapp: string };
export type Post = {
  id: string; edicion: string; uid: string; modo: "equipo" | "individual"; estado: string;
  nombre: string; correo: string; whatsapp: string; integrantes?: Miembro[];
  creadoEn?: Timestamp; actualizadoEn?: Timestamp;
  correoEstado?: string; correoEnviadoEn?: Timestamp;
};
export type SponsorDoc = {
  id: string; organizacion: string; contacto: string; cargo: string; correo: string; telefono: string;
  tipoApoyo: string[]; mensaje: string; estado: string; creadoEn?: Timestamp;
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
export const estadoTexto = (v: string) => [...ESTADOS, ...OTROS].find((e) => e.v === v)?.t ?? v;

export const fecha = (t?: Timestamp) => (t ? t.toDate().toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

/** CSV con BOM y separador de comas: se abre bien en Excel con acentos. */
export function descargarCsv(nombre: string, filas: (string | number)[][]) {
  const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + filas.map((f) => f.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

/** Una fila por persona: quien lidera (o postula solo) y cada integrante. */
export function filasPersonas(posts: Post[]): (string | number)[][] {
  const out: (string | number)[][] = [["Rol", "Nombre", "Correo", "WhatsApp", "Modo", "Equipo de", "Estado", "Fecha de registro"]];
  for (const p of posts) {
    const n = 1 + (p.integrantes?.length ?? 0);
    const fecha = p.creadoEn ? p.creadoEn.toDate().toISOString() : "";
    out.push([p.modo === "equipo" ? "Líder" : "Individual", p.nombre, p.correo, p.whatsapp, p.modo, n, estadoTexto(p.estado), fecha]);
    (p.integrantes ?? []).forEach((m) => out.push(["Integrante", m.nombre, m.correo, m.whatsapp, p.modo, n, estadoTexto(p.estado), ""]));
  }
  return out;
}
