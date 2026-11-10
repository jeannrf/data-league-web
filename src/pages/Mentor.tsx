import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Shell from "../components/Shell";
import { firebaseConfigured } from "../lib/firebase";
import { areasMentor, enviarMentor, mentorSchema, type MentorData, type MentorForm } from "../lib/mentor";

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

export default function Mentor() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<MentorForm, unknown, MentorData>({
    resolver: zodResolver(mentorSchema), defaultValues: { areas: [] }, mode: "onTouched",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const sel = watch("areas") ?? [];
  const e = (k: keyof MentorForm) => errors[k]?.message as string | undefined;
  const a = (id: keyof MentorForm, hint?: boolean) => ({ id, "aria-describedby": [hint ? `${id}-hint` : "", e(id) ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined });

  async function submit(v: MentorData) {
    setError("");
    try { await enviarMentor(v); setDone(true); window.scrollTo({ top: 0 }); }
    catch { setError("No pudimos enviar tu postulación. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí."); }
  }

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        {done ? (
          <div className="max-w-2xl">
            <h1 className="title h-xl">¡Gracias!</h1>
            <p className="mt-6 text-xl text-ink">Recibimos tu postulación. El equipo organizador te escribirá al correo que dejaste para contarte cómo puedes acompañar a los equipos de Data League 2026.</p>
            <Link to="/" className="btn btn-ghost mt-10 no-underline">Volver al inicio</Link>
          </div>
        ) : (
          <>
            <h1 className="title h-xl">Postular como mentor</h1>
            <p className="measure mt-6 text-xl text-ink">Los talleres ya tienen sus ponentes. Ahora buscamos personas que trabajen o investiguen con datos y quieran acompañar a los equipos mientras desarrollan su desafío. No es un compromiso: el equipo organizador te escribirá para conversarlo.</p>
            {!firebaseConfigured && <p className="err mt-6">Falta configurar Firebase (ver docs/firebase-setup.md).</p>}
            <form className="mt-12 grid max-w-6xl gap-x-20 gap-y-12 lg:grid-cols-2" noValidate onSubmit={handleSubmit(submit)}>
              <div className="grid content-start gap-6">
                <h2 className="display text-2xl leading-none text-ink">Sobre ti</h2>
                <Field label="Nombre completo" id="nombre" error={e("nombre")}><input autoComplete="name" {...a("nombre")} {...register("nombre")} /></Field>
                <Field label="Correo" id="correo" error={e("correo")}><input type="email" autoComplete="email" {...a("correo")} {...register("correo")} /></Field>
                <Field label="¿A qué te dedicas y dónde?" id="ocupacion" hint="Por ejemplo: científica de datos en una empresa, docente universitario, investigadora." error={e("ocupacion")}><input autoComplete="organization-title" {...a("ocupacion", true)} {...register("ocupacion")} /></Field>
                <Field label="Teléfono o WhatsApp (opcional)" id="telefono" error={e("telefono")}><input type="tel" autoComplete="tel" {...a("telefono")} {...register("telefono")} /></Field>
                <Field label="LinkedIn o página web (opcional)" id="perfil" error={e("perfil")}><input autoComplete="url" {...a("perfil")} {...register("perfil")} /></Field>
              </div>
              <div className="grid content-start gap-6">
                <h2 className="display text-2xl leading-none text-ink">Cómo puedes acompañar</h2>
                <Field label="¿En qué áreas puedes guiar a los equipos?" id="areas" hint="Elige las que quieras." error={e("areas")}>
                  <div className="chips" role="group" aria-label="Áreas de mentoría">
                    {areasMentor.map((t) => (
                      <label key={t.v} className={`chip ${sel.includes(t.v) ? "on" : ""}`}><input type="checkbox" value={t.v} {...register("areas")} />{t.t}</label>
                    ))}
                  </div>
                </Field>
                <Field label="Mensaje (opcional)" id="mensaje" hint="Cuéntanos tu experiencia o cuánto tiempo podrías dedicar." error={e("mensaje")}><textarea rows={5} className="area" {...a("mensaje", true)} {...register("mensaje")} /></Field>
                {/* Campo trampa: oculto para las personas; los bots suelen llenarlo. */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>No llenar<input tabIndex={-1} autoComplete="off" {...register("web")} /></label></div>
                <div>
                  <label className="check"><input type="checkbox" {...register("consentimientoDatos")} /><span>Doy mi consentimiento para que Data League use estos datos con el fin de contactarme sobre la mentoría.</span></label>
                  {e("consentimientoDatos") && <p className="err mt-2" role="alert">{e("consentimientoDatos")}</p>}
                </div>
                {error && <p className="err text-lg" role="alert">{error}</p>}
                <div><button type="submit" className="btn" disabled={isSubmitting}>{isSubmitting ? "Enviando…" : "Enviar postulación"}</button></div>
              </div>
            </form>
          </>
        )}
      </div>
    </Shell>
  );
}
