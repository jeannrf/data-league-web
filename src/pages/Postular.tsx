import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import { CorreoRepetido, enviarPostulacion, existePostulacion, postulacionCerrada, postulacionSchema, type PostulacionData, type PostulacionForm } from "../lib/postulacion";
import { FECHA_LIMITE } from "../config";
import Shell from "../components/Shell";
import AuthModal from "../components/AuthModal";

function Field({ label, name, hint, children }: { label: string; name: string; hint?: string; children: React.ReactNode }) {
  const { getFieldState, formState } = useFormContext();
  const err = getFieldState(name, formState).error?.message as string | undefined;
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {hint && <p className="hint" id={`${name}-hint`}>{hint}</p>}
      {children}
      {err && <p className="err" role="alert" id={`${name}-err`}>{err}</p>}
    </div>
  );
}
const aria = (name: string, hint?: boolean) => ({ id: name, "aria-describedby": [hint ? `${name}-hint` : "", `${name}-err`].filter(Boolean).join(" ") || undefined });

export default function Postular() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const restored = useRef(false);

  const methods = useForm<PostulacionForm, unknown, PostulacionData>({
    resolver: zodResolver(postulacionSchema), defaultValues: { nombre: "", celular: "", integrantes: [], correoLider: "" } as unknown as PostulacionForm, mode: "onTouched",
  });
  const { register, control, handleSubmit, watch, formState: { errors } } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: "integrantes" });

  // Si ya postuló, va a su área.
  useEffect(() => {
    if (!user) { setChecking(false); return; }
    void existePostulacion(user.uid).then((ya) => { if (ya) navigate("/mi-postulacion", { replace: true }); else setChecking(false); });
  }, [user, navigate]);

  // Borrador en el navegador por si se recarga la página.
  const draftKey = user ? `dl-draft2-${user.uid}` : "";
  useEffect(() => {
    if (!user || restored.current) return;
    restored.current = true;
    const mail = (user.email ?? "").toLowerCase();
    try {
      const raw = localStorage.getItem(draftKey);
      methods.reset({ nombre: user.displayName ?? "", celular: "", integrantes: [], ...(raw ? JSON.parse(raw) : {}), correoLider: mail } as PostulacionForm);
    } catch { methods.setValue("correoLider", mail); }
  }, [user, draftKey, methods]);
  useEffect(() => {
    if (!user) return;
    const sub = watch((v) => { try { const { acepta, ...rest } = v as PostulacionForm; void acepta; localStorage.setItem(draftKey, JSON.stringify(rest)); } catch { /* sin almacenamiento */ } });
    return () => sub.unsubscribe();
  }, [watch, user, draftKey]);

  async function submit(values: PostulacionData) {
    if (!user) return;
    setSubmitting(true); setFormError("");
    try {
      await enviarPostulacion(user, values);
      try { localStorage.removeItem(draftKey); } catch { /* nada */ }
      navigate("/mi-postulacion", { state: { enviada: true } });
    } catch (e) {
      if (e instanceof CorreoRepetido) setFormError(`El correo ${e.correo} ya está inscrito en otra postulación. Cada persona solo puede estar en una; cambia ese correo o avísale a esa persona.`);
      else if ((e as { code?: string }).code === "permission-denied") setFormError("No pudimos guardar tu postulación. Puede que las postulaciones hayan cerrado o que algún dato no sea válido. Revísalos e inténtalo de nuevo.");
      else setFormError("Algo falló al enviar. Revisa tu conexión e inténtalo de nuevo; tus datos siguen aquí.");
    } finally { setSubmitting(false); }
  }

  const cerrada = postulacionCerrada();
  const aceptaErr = errors.acepta?.message as string | undefined;
  const intsErr = errors.integrantes as { message?: string } | undefined;

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        {!firebaseConfigured ? (
          <p className="text-xl text-ink">Falta configurar Firebase (variables <code>VITE_FIREBASE_*</code>, ver <code>.env.example</code>).</p>
        ) : cerrada ? (
          <div>
            <h1 className="title h-xl">Postulaciones cerradas</h1>
            <p className="measure mt-6 text-xl text-ink">El plazo terminó el {FECHA_LIMITE.toLocaleDateString("es-PE", { day: "numeric", month: "long" })} a las 23:59. <Link to="/">Volver al inicio</Link>.</p>
          </div>
        ) : loading || checking ? (
          <p role="status" className="text-xl text-ink">Cargando…</p>
        ) : !user ? (
          <>
            <p className="text-xl text-ink">Inicia sesión con Google para continuar con tu postulación.</p>
            <AuthModal open onClose={() => navigate("/")} onSignedIn={() => undefined} />
          </>
        ) : (
          <FormProvider {...methods}>
            <div>
              <div>
                <h1 className="title h-xl">Postular</h1>
                <p className="mt-4 text-soft">Sesión: <b className="text-ink">{user.email}</b> · <button type="button" className="link-btn" onClick={() => void signOut()}>Cerrar sesión</button> · Cierra el 29 de noviembre, 23:59</p>

                <form className="mt-10 grid gap-12" noValidate onSubmit={handleSubmit(submit)}>
                  <section aria-labelledby="t-tus-datos">
                    <h2 id="t-tus-datos" className="title text-3xl">Tus datos</h2>
                    <div className="mt-6 grid gap-6 md:grid-cols-3">
                      <Field label="Nombre completo" name="nombre"><input autoComplete="name" {...aria("nombre")} {...register("nombre")} /></Field>
                      <Field label="Celular (WhatsApp)" name="celular"><input type="tel" inputMode="tel" autoComplete="tel" placeholder="987 654 321 o +57 300…" {...aria("celular")} {...register("celular")} /></Field>
                      <div className="field">
                        <label htmlFor="correo-lider">Correo de Google</label>
                        <input id="correo-lider" value={user.email ?? ""} readOnly aria-readonly="true" className="opacity-70" />
                      </div>
                    </div>
                  </section>

                  <section aria-labelledby="t-equipo">
                    <h2 id="t-equipo" className="title text-3xl">Tu equipo</h2>
                    <p className="measure mt-3 text-ink">Tú eres la persona 1. ¿Vas con equipo? Agrega a las <b>otras</b> personas, de 1 a 3, con sus propios datos. No necesitan cuenta. Si vas solo, sáltate esto.</p>
                    <div className="mt-6 grid gap-8">
                      {fields.map((f, i) => (
                        <fieldset key={f.id} className="member">
                          <legend className="title text-2xl">Persona {i + 2} de tu equipo</legend>
                          <p className="-mt-3 text-soft">Datos de otra persona, no los tuyos.</p>
                          <div className="grid gap-6 md:grid-cols-3">
                            <Field label="Nombre completo" name={`integrantes.${i}.nombre`}><input autoComplete="off" {...aria(`integrantes.${i}.nombre`)} {...register(`integrantes.${i}.nombre`)} /></Field>
                            <Field label="Celular" name={`integrantes.${i}.celular`}><input type="tel" inputMode="tel" autoComplete="off" {...aria(`integrantes.${i}.celular`)} {...register(`integrantes.${i}.celular`)} /></Field>
                            <Field label="Correo" name={`integrantes.${i}.correo`}><input type="email" autoComplete="off" {...aria(`integrantes.${i}.correo`)} {...register(`integrantes.${i}.correo`)} /></Field>
                          </div>
                          <button type="button" className="link-btn" onClick={() => remove(i)}>Quitar a esta persona</button>
                        </fieldset>
                      ))}
                      {fields.length < 3 && (
                        <button type="button" className="btn btn-ghost w-fit" onClick={() => append({ nombre: "", celular: "", correo: "" })}>{fields.length === 0 ? "Agregar integrante" : "Agregar otro integrante"}</button>
                      )}
                      {intsErr?.message && <p className="err" role="alert">{intsErr.message}</p>}
                    </div>
                  </section>

                  <div>
                    <label className="check">
                      <input type="checkbox" {...register("acepta")} />
                      <span>Declaro que {fields.length ? "todas las personas inscritas son" : "soy"} estudiante{fields.length ? "s" : ""} activo{fields.length ? "s" : ""} de pregrado (universidad o instituto) y mayor{fields.length ? "es" : ""} de 18 años{fields.length ? ", que autorizaron compartir sus datos" : ""}, y acepto el tratamiento de los datos para organizar Data League y las bases del concurso.</span>
                    </label>
                    {aceptaErr && <p className="err mt-2" role="alert">{aceptaErr}</p>}
                  </div>

                  {formError && <p className="err text-lg" role="alert">{formError}</p>}
                  <div><button type="submit" className="btn" disabled={submitting}>{submitting ? "Enviando…" : "Enviar postulación"}</button></div>
                </form>
              </div>
            </div>
          </FormProvider>
        )}
      </div>
    </Shell>
  );
}
