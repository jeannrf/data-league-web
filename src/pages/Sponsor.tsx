import { useState } from "react";
import { Link } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Shell from "../components/Shell";
import { firebaseConfigured } from "../lib/firebase";
import { enviarSponsor, sponsorSchema, tiposApoyo, type SponsorData, type SponsorForm } from "../lib/sponsor";

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

export default function Sponsor() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<SponsorForm, unknown, SponsorData>({
    resolver: zodResolver(sponsorSchema), defaultValues: { tipoApoyo: [] }, mode: "onTouched",
  });
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const sel = watch("tipoApoyo") ?? [];
  const e = (k: keyof SponsorForm) => errors[k]?.message as string | undefined;
  const a = (id: keyof SponsorForm, hint?: boolean) => ({ id, "aria-describedby": [hint ? `${id}-hint` : "", e(id) ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined });

  async function submit(v: SponsorData) {
    setError("");
    try { await enviarSponsor(v); setDone(true); window.scrollTo({ top: 0 }); }
    catch { setError("No pudimos enviar tu solicitud. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí."); }
  }

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        {done ? (
          <div className="max-w-2xl">
            <h1 className="title h-xl">¡Gracias!</h1>
            <p className="mt-6 text-xl text-ink">Recibimos tu solicitud. El equipo organizador te escribirá al correo que dejaste para conversar cómo participar en Data League 2026.</p>
            <Link to="/" className="btn btn-ghost mt-10 no-underline">Volver al inicio</Link>
          </div>
        ) : (
          <>
            <h1 className="title h-xl">Postular como sponsor</h1>
            <p className="measure mt-6 text-xl text-ink">Cuéntanos quién eres y cómo te gustaría apoyar a Data League. No es un compromiso: el equipo organizador te escribirá para conversarlo.</p>
            {!firebaseConfigured && <p className="err mt-6">Falta configurar Firebase (ver docs/firebase-setup.md).</p>}
            <form className="mt-12 grid max-w-3xl gap-6 md:grid-cols-2" noValidate onSubmit={handleSubmit(submit)}>
              <div className="md:col-span-2"><Field label="Empresa u organización" id="organizacion" error={e("organizacion")}><input autoComplete="organization" {...a("organizacion")} {...register("organizacion")} /></Field></div>
              <Field label="Persona de contacto" id="contacto" error={e("contacto")}><input autoComplete="name" {...a("contacto")} {...register("contacto")} /></Field>
              <Field label="Cargo o rol" id="cargo" error={e("cargo")}><input autoComplete="organization-title" {...a("cargo")} {...register("cargo")} /></Field>
              <Field label="Correo" id="correo" error={e("correo")}><input type="email" autoComplete="email" {...a("correo")} {...register("correo")} /></Field>
              <Field label="Teléfono o WhatsApp (opcional)" id="telefono" error={e("telefono")}><input type="tel" autoComplete="tel" {...a("telefono")} {...register("telefono")} /></Field>
              <div className="md:col-span-2">
                <Field label="¿Cómo te gustaría apoyar?" id="tipoApoyo" hint="Elige las que quieras." error={e("tipoApoyo")}>
                  <div className="chips" role="group" aria-label="Formas de apoyo">
                    {tiposApoyo.map((t) => (
                      <label key={t.v} className={`chip ${sel.includes(t.v) ? "on" : ""}`}><input type="checkbox" value={t.v} {...register("tipoApoyo")} />{t.t}</label>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Mensaje (opcional)" id="mensaje" error={e("mensaje")}><textarea rows={5} className="area" {...a("mensaje")} {...register("mensaje")} /></Field>
              </div>
              {/* Campo trampa: oculto para las personas; los bots suelen llenarlo. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>No llenar<input tabIndex={-1} autoComplete="off" {...register("web")} /></label></div>
              <div className="md:col-span-2">
                <label className="check"><input type="checkbox" {...register("consentimientoDatos")} /><span>Doy mi consentimiento para que Data League use estos datos con el fin de contactarme sobre el patrocinio.</span></label>
                {e("consentimientoDatos") && <p className="err mt-2" role="alert">{e("consentimientoDatos")}</p>}
              </div>
              {error && <p className="err md:col-span-2 text-lg" role="alert">{error}</p>}
              <div className="md:col-span-2"><button type="submit" className="btn" disabled={isSubmitting}>{isSubmitting ? "Enviando…" : "Enviar solicitud"}</button></div>
            </form>
          </>
        )}
      </div>
    </Shell>
  );
}
