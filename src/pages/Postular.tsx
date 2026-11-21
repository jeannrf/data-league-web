import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import { CorreoRepetido, NoEditable, editarPostulacion, enviarPostulacion, esEditable, existePostulacion, leerPostulacion, postulacionCerrada, postulacionSchema, type PostulacionData, type PostulacionForm } from "../lib/postulacion";
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
  const editar = useSearchParams()[0].has("editar");   // /postular?editar: cambia los datos de una postulación ya enviada
  const [editando, setEditando] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const restored = useRef(false);

  const methods = useForm<PostulacionForm, unknown, PostulacionData>({
    resolver: zodResolver(postulacionSchema), defaultValues: { nombre: "", celular: "", nombreEquipo: "", integrantes: [], correoLider: "" } as unknown as PostulacionForm, mode: "onTouched",
  });
  const { register, control, handleSubmit, watch, formState: { errors } } = methods;
  const { fields, append, remove, replace } = useFieldArray({ control, name: "integrantes" });
  // Solo o con equipo. Si ya hay integrantes guardados (borrador o edición), se abre en «equipo».
  const [modo, setModo] = useState<"solo" | "equipo" | null>(null);
  useEffect(() => { if (fields.length > 0) setModo("equipo"); }, [fields.length]);
  function elegirModo(m: "solo" | "equipo") {
    if (m === "solo" && fields.some((_, i) => Object.values(methods.getValues(`integrantes.${i}`) ?? {}).some((x) => String(x).trim()))
      && !window.confirm("Se borrarán los datos de tus compañeros. ¿Inscribirte solo?")) return;
    if (m === "solo") { replace([]); methods.setValue("nombreEquipo", ""); }
    if (m === "equipo" && fields.length === 0) append({ nombre: "", celular: "", correo: "" }, { shouldFocus: false });
    setModo(m);
  }

  // Si ya postuló, va a su área. Al editar, se rellena el formulario con lo guardado (solo si aún se puede editar).
  useEffect(() => {
    if (!user) { setChecking(false); return; }
    if (editar) {
      void leerPostulacion(user.uid).then((p) => {
        if (!p || !esEditable(p.estado)) { navigate("/mi-postulacion", { replace: true }); return; }
        restored.current = true;
        methods.reset({
          correoLider: (user.email ?? "").toLowerCase(), nombre: p.nombre, celular: p.whatsapp, nombreEquipo: p.nombreEquipo ?? "",
          integrantes: (p.integrantes ?? []).map((m) => ({ nombre: m.nombre, celular: m.whatsapp, correo: m.correo })), acepta: true,
        } as PostulacionForm);
        setModo((p.integrantes ?? []).length ? "equipo" : "solo");
        setEditando(true);
        setChecking(false);
      }).catch(() => navigate("/mi-postulacion", { replace: true }));
      return;
    }
    void existePostulacion(user.uid).then((ya) => { if (ya) navigate("/mi-postulacion", { replace: true }); else setChecking(false); });
  }, [user, navigate, editar, methods]);

  // Borrador en el navegador por si se recarga la página.
  const draftKey = user ? `dl-draft2-${user.uid}` : "";
  useEffect(() => {
    if (!user || editar || restored.current) return;
    restored.current = true;
    const mail = (user.email ?? "").toLowerCase();
    try {
      const raw = localStorage.getItem(draftKey);
      methods.reset({ nombre: user.displayName ?? "", celular: "", nombreEquipo: "", integrantes: [], ...(raw ? JSON.parse(raw) : {}), correoLider: mail } as PostulacionForm);
    } catch { methods.setValue("correoLider", mail); }
  }, [user, draftKey, methods]);
  useEffect(() => {
    if (!user || editar) return;
    const sub = watch((v) => { try { const { acepta, ...rest } = v as PostulacionForm; void acepta; localStorage.setItem(draftKey, JSON.stringify(rest)); } catch { /* sin almacenamiento */ } });
    return () => sub.unsubscribe();
  }, [watch, user, draftKey, editar]);

  async function submit(values: PostulacionData) {
    if (!user) return;
    setSubmitting(true); setFormError("");
    try {
      if (editando) {
        await editarPostulacion(user, values);
        navigate("/mi-postulacion", { state: { editada: true } });
        return;
      }
      await enviarPostulacion(user, values);
      try { localStorage.removeItem(draftKey); } catch { /* nada */ }
      navigate("/mi-postulacion", { state: { enviada: true } });
    } catch (e) {
      if (e instanceof NoEditable) setFormError("Tu postulación ya no se puede editar: el equipo organizador cambió su estado. Revísala en «Mi postulación».");
      else if (e instanceof CorreoRepetido) setFormError(`El correo ${e.correo} ya está inscrito en otra postulación. Cada persona solo puede estar en una; cambia ese correo o avísale a esa persona.`);
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
                <h1 className="title h-xl">{editando ? "Editar postulación" : "Postular"}</h1>
                <p className="mt-4 text-soft">Sesión: <b className="text-ink">{user.email}</b> · <button type="button" className="link-btn link-danger" onClick={() => void signOut()}>Cerrar sesión</button> · Cierra el 29 de noviembre, 23:59</p>

                <form className="mt-10 grid gap-12" noValidate onSubmit={handleSubmit(submit)}>
                  <fieldset className="grid gap-4">
                    <legend className="title text-3xl">¿Cómo te inscribes?</legend>
                    <div className="mt-4">
                      <label className="choice">
                        <input type="radio" name="modo" checked={modo === "solo"} onChange={() => elegirModo("solo")} />
                        <span className="choice-body"><span className="choice-title">Solo</span><span className="choice-text">Participas tú solo. Solo necesitamos tus datos.</span></span>
                      </label>
                      <label className="choice">
                        <input type="radio" name="modo" checked={modo === "equipo"} onChange={() => elegirModo("equipo")} />
                        <span className="choice-body"><span className="choice-title">Con equipo</span><span className="choice-text">De 2 a 4 participantes contándote. Tus compañeros no necesitan cuenta.</span></span>
                      </label>
                    </div>
                  </fieldset>

                  {modo && (
                    <section aria-labelledby="t-datos" className="grid gap-8">
                      <h2 id="t-datos" className="title text-3xl">{modo === "solo" ? "Tus datos" : "Tu equipo"}</h2>
                      {modo === "equipo" && (
                        <div className="max-w-xl">
                          <Field label="Nombre del equipo" name="nombreEquipo"><input autoComplete="off" maxLength={60} {...aria("nombreEquipo")} {...register("nombreEquipo")} /></Field>
                        </div>
                      )}
                      <fieldset className={modo === "equipo" ? "member" : "grid gap-6"}>
                        {modo === "equipo" && <legend className="title text-2xl">Participante 1: tú</legend>}
                        <div className="grid gap-6 md:grid-cols-3">
                          <Field label="Nombre completo" name="nombre"><input autoComplete="name" {...aria("nombre")} {...register("nombre")} /></Field>
                          <Field label="Celular (WhatsApp)" name="celular"><input type="tel" inputMode="tel" autoComplete="tel" placeholder="987 654 321 o +57 300…" {...aria("celular")} {...register("celular")} /></Field>
                          <div className="field">
                            <label htmlFor="correo-lider">Correo de Google</label>
                            <input id="correo-lider" value={user.email ?? ""} readOnly aria-readonly="true" className="opacity-70" />
                          </div>
                        </div>
                      </fieldset>
                      {modo === "equipo" && fields.map((f, i) => (
                        <fieldset key={f.id} className="member">
                          <legend className="title text-2xl">Participante {i + 2}</legend>
                          <div className="grid gap-6 md:grid-cols-3">
                            <Field label="Nombre completo" name={`integrantes.${i}.nombre`}><input autoComplete="off" {...aria(`integrantes.${i}.nombre`)} {...register(`integrantes.${i}.nombre`)} /></Field>
                            <Field label="Celular" name={`integrantes.${i}.celular`}><input type="tel" inputMode="tel" autoComplete="off" {...aria(`integrantes.${i}.celular`)} {...register(`integrantes.${i}.celular`)} /></Field>
                            <Field label="Correo" name={`integrantes.${i}.correo`}><input type="email" autoComplete="off" {...aria(`integrantes.${i}.correo`)} {...register(`integrantes.${i}.correo`)} /></Field>
                          </div>
                          {fields.length > 1 && <button type="button" className="link-btn w-fit" onClick={() => remove(i)}>Quitar participante {i + 2}</button>}
                        </fieldset>
                      ))}
                      {modo === "equipo" && fields.length < 3 && (
                        <button type="button" className="btn btn-ghost w-fit" onClick={() => append({ nombre: "", celular: "", correo: "" })}>+ Añadir participante {fields.length + 2}</button>
                      )}
                      {intsErr?.message && <p className="err" role="alert">{intsErr.message}</p>}
                    </section>
                  )}

                  <div>
                    <label className="check">
                      <input type="checkbox" {...register("acepta")} />
                      <span>Declaro que {fields.length ? "todas las personas inscritas son" : "soy"} estudiante{fields.length ? "s" : ""} activo{fields.length ? "s" : ""} de pregrado (universidad o instituto) y mayor{fields.length ? "es" : ""} de 18 años{fields.length ? ", que autorizaron compartir sus datos" : ""}, y acepto el tratamiento de los datos para organizar Data League y las bases del concurso.</span>
                    </label>
                    {aceptaErr && <p className="err mt-2" role="alert">{aceptaErr}</p>}
                  </div>

                  {formError && <p className="err text-lg" role="alert">{formError}</p>}
                  <div className="flex flex-wrap items-center gap-4"><button type="submit" className="btn" disabled={submitting || !modo}>{submitting ? (editando ? "Guardando…" : "Enviando…") : editando ? "Guardar cambios" : "Enviar postulación"}</button>
                    {editando && <Link to="/mi-postulacion" className="btn btn-ghost no-underline">Cancelar</Link>}</div>
                </form>
              </div>
            </div>
          </FormProvider>
        )}
      </div>
    </Shell>
  );
}
