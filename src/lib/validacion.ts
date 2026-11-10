import { z } from "zod";

/** Celular: 9 dígitos que empiezan con 9 (Perú) o un número internacional con +código. Devuelve E.164 o null. */
export function normalizarCelular(v: string): string | null {
  const t = v.trim().replace(/[\s().-]/g, "");
  if (/^9\d{8}$/.test(t)) return `+51${t}`;
  if (t.startsWith("+51")) return /^\+519\d{8}$/.test(t) ? t : null;   // Perú: siempre 9 dígitos que empiezan con 9
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
  nombreEquipo: z.string().trim().max(60, "Máximo 60 caracteres.").optional(),
  integrantes: z.array(integranteSchema).max(3, "Un equipo tiene como máximo 4 personas contándote."),
  acepta: z.literal(true, { message: "Marca la casilla para poder enviar tu postulación." }),
}).superRefine((v, ctx) => {
  for (const i of crossIssues(v)) ctx.addIssue({ code: "custom", path: i.path, message: i.message });
});

export type PostulacionForm = z.input<typeof postulacionSchema>;
export type PostulacionData = z.output<typeof postulacionSchema>;
type Issue = { path: (string | number)[]; message: string };

/** Equipo sin nombre y datos repetidos dentro del equipo: correos, y nombre o celular iguales a los de quien postula. */
export function crossIssues(v: Partial<PostulacionForm>): Issue[] {
  const out: Issue[] = [];
  if ((v.integrantes ?? []).length > 0 && !(v.nombreEquipo ?? "").trim())
    out.push({ path: ["nombreEquipo"], message: "Ponle un nombre a tu equipo." });
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

