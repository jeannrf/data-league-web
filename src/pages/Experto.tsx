import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Shell from "../components/Shell";
import { firebaseConfigured } from "../lib/firebase";
import { aniosExperiencia, areasMentor, disponibilidades, enviarExperto, expertoSchema, rolesPrevios, type ExpertoData, type ExpertoForm, type Rol } from "../lib/experto";

function Field({ label, id, error, hint, children }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      {children}
      {error && <p className="err" role="alert" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

/** Grupo de opciones como chips (checkbox o radio). */
function Group({ legend, id, hint, error, children }: { legend: string; id: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <fieldset className="field" aria-describedby={[hint ? `${id}-hint` : "", error ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined}>
      <legend className="mb-1 font-bold text-ink">{legend}</legend>
      {hint && <p className="hint" id={`${id}-hint`}>{hint}</p>}
      <div className="chips">{children}</div>
      {error && <p className="err" role="alert" id={`${id}-err`}>{error}</p>}
    </fieldset>
  );
}

const textos = {
  mentor: {
    titulo: "Postular como mentor",
    intro: "Los talleres ya tienen sus ponentes. Ahora buscamos personas que trabajen o investiguen con datos y quieran acompañar a los equipos para mejorar sus proyectos. No es un compromiso: el equipo organizador te escribirá para conversarlo.",
    bloque: "Cómo puedes acompañar",
    areas: "¿En qué áreas puedes guiar a los equipos?",
    consentimiento: "Doy mi consentimiento para que Data League use estos datos con el fin de contactarme sobre la mentoría.",
    gracias: "Recibimos tu postulación. El equipo organizador te escribirá al correo que dejaste para contarte cómo puedes acompañar a los equipos de Data League 2026.",
  },
  jurado: {
    titulo: "Postular como jurado",
    intro: "El jurado evalúa los proyectos de todos los equipos finalistas en la final presencial del 5 de diciembre en la UNI. Buscamos profesionales con experiencia en datos. El equipo organizador te escribirá para conversarlo.",
    bloque: "Qué puedes evaluar",
    areas: "¿En qué áreas te sientes cómodo evaluando?",
    consentimiento: "Doy mi consentimiento para que Data League use estos datos con el fin de contactarme sobre el jurado.",
    gracias: "Recibimos tu postulación. El equipo organizador te escribirá al correo que dejaste para contarte cómo será la evaluación de Data League 2026.",
  },
} as const;

export default function Experto({ rol }: { rol: Rol }) {
  const t = textos[rol];
  const schema = useMemo(() => expertoSchema(rol), [rol]);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ExpertoForm, unknown, ExpertoData>({
    resolver: zodResolver(schema), defaultValues: { areas: [], rolesPrevios: [] }, mode: "onTouched",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const areas = watch("areas") ?? [];
  const roles = watch("rolesPrevios") ?? [];
  const anios = watch("anios");
  const disp = watch("disponibilidad");
  const e = (k: keyof ExpertoForm) => errors[k]?.message as string | undefined;
  const a = (id: keyof ExpertoForm, hint?: boolean) => ({ id, "aria-invalid": e(id) ? true : undefined, "aria-describedby": [hint ? `${id}-hint` : "", e(id) ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined });

  async function submit(v: ExpertoData) {
    setError("");
    try { await enviarExperto(rol, v); setDone(true); window.scrollTo({ top: 0 }); }
    catch { setError("No pudimos enviar tu postulación. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí."); }
  }

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        {done ? (
          <div className="max-w-2xl">
            <h1 className="title h-xl">¡Gracias!</h1>
            <p className="mt-6 text-xl text-ink">{t.gracias}</p>
          </div>
        ) : (
          <>
            <h1 className="title h-xl">{t.titulo}</h1>
            <p className="measure mt-6 text-xl text-ink">{t.intro}</p>
            {!firebaseConfigured && <p className="err mt-6">Falta configurar Firebase (ver docs/firebase-setup.md).</p>}
            <form className="mt-12 grid max-w-6xl gap-x-20 gap-y-14 lg:grid-cols-2" noValidate onSubmit={handleSubmit(submit)}>
              <div className="grid content-start gap-6">
                <h2 className="display text-2xl leading-none text-ink">Sobre ti</h2>
                <Field label="Nombre completo" id="nombre" error={e("nombre")}><input autoComplete="name" {...a("nombre")} {...register("nombre")} /></Field>
                <Field label="Correo" id="correo" error={e("correo")}><input type="email" autoComplete="email" {...a("correo")} {...register("correo")} /></Field>
                <Field label="¿A qué te dedicas y dónde?" id="ocupacion" hint="Por ejemplo: científica de datos en una empresa, docente universitario, investigadora." error={e("ocupacion")}><input autoComplete="organization-title" {...a("ocupacion", true)} {...register("ocupacion")} /></Field>
                <Field label="Teléfono o WhatsApp (opcional)" id="telefono" error={e("telefono")}><input type="tel" autoComplete="tel" {...a("telefono")} {...register("telefono")} /></Field>
                <Field label="LinkedIn o página web (opcional)" id="perfil" error={e("perfil")}><input autoComplete="url" {...a("perfil")} {...register("perfil")} /></Field>
              </div>

              <div className="grid content-start gap-6">
                <h2 className="display text-2xl leading-none text-ink">Tu trayectoria</h2>
                <Group legend="Años de experiencia en datos" id="anios" error={e("anios")}>
                  {aniosExperiencia.map((o) => (
                    <label key={o.v} className={`chip ${anios === o.v ? "on" : ""}`}><input type="radio" value={o.v} {...register("anios")} />{o.t}</label>
                  ))}
                </Group>
                <Group legend="¿Has participado antes en hackatones o concursos como…?" id="rolesPrevios" hint="Elige todas las que apliquen." error={e("rolesPrevios")}>
                  {rolesPrevios.map((o) => (
                    <label key={o.v} className={`chip ${roles.includes(o.v) ? "on" : ""}`}><input type="checkbox" value={o.v} {...register("rolesPrevios")} />{o.t}</label>
                  ))}
                </Group>
                <Field label="¿En qué has trabajado?" id="trayectoria" hint="Proyectos, empresas o investigaciones, y los eventos donde fuiste mentor, jurado o ponente." error={e("trayectoria")}><textarea rows={5} className="area" {...a("trayectoria", true)} {...register("trayectoria")} /></Field>
                <Field label="Recomendaciones o referencias (opcional)" id="referencias" hint="Alguien que pueda recomendarte (nombre y contacto) o un enlace a tus recomendaciones de LinkedIn." error={e("referencias")}><textarea rows={3} className="area area-sm" {...a("referencias", true)} {...register("referencias")} /></Field>
              </div>

              <div className="grid gap-x-20 gap-y-6 border-t border-line pt-12 lg:col-span-2 lg:grid-cols-2">
                <h2 className="display text-2xl leading-none text-ink lg:col-span-2">{t.bloque}</h2>
                <div className="grid content-start gap-6">
                  <Group legend={t.areas} id="areas" hint="Elige las que quieras." error={e("areas")}>
                    {areasMentor.map((o) => (
                      <label key={o.v} className={`chip ${areas.includes(o.v) ? "on" : ""}`}><input type="checkbox" value={o.v} {...register("areas")} />{o.t}</label>
                    ))}
                  </Group>
                  {rol === "jurado" && (
                    <Group legend="¿Puedes asistir a la final presencial del 5 de diciembre?" id="disponibilidad" error={e("disponibilidad")}>
                      {disponibilidades.map((o) => (
                        <label key={o.v} className={`chip ${disp === o.v ? "on" : ""}`}><input type="radio" value={o.v} {...register("disponibilidad")} />{o.t}</label>
                      ))}
                    </Group>
                  )}
                </div>
                <div className="grid content-start gap-6">
                  <Field label="Mensaje (opcional)" id="mensaje" hint="Cuánto tiempo podrías dedicar o algo más que debamos saber." error={e("mensaje")}><textarea rows={4} className="area" {...a("mensaje", true)} {...register("mensaje")} /></Field>
                  {/* Campo trampa: oculto para las personas; los bots suelen llenarlo. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>No llenar<input tabIndex={-1} autoComplete="off" {...register("web")} /></label></div>
                  <div>
                    <label className="check"><input type="checkbox" {...register("consentimientoDatos")} /><span>{t.consentimiento}</span></label>
                    {e("consentimientoDatos") && <p className="err mt-2" role="alert">{e("consentimientoDatos")}</p>}
                  </div>
                  {error && <p className="err text-lg" role="alert">{error}</p>}
                  <div><button type="submit" className="btn" disabled={isSubmitting}>{isSubmitting ? "Enviando…" : "Enviar postulación"}</button></div>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </Shell>
  );
}
