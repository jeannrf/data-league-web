import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../lib/auth";
import { firebaseConfigured } from "../lib/firebase";
import {
  CorreoRepetido, crossIssues, areas, comoSeEntero, enviarPostulacion, existePostulacion, instituciones, postulacionCerrada,
  postulacionSchema, prefijos, type PostulacionData, type PostulacionForm,
} from "../lib/postulacion";
import { FECHA_LIMITE, tracks } from "../config";
import Shell from "../components/Shell";
import AuthModal from "../components/AuthModal";
import TeamNet from "../components/TeamNet";

/* ---------- campos ---------- */
function Field({ label, name, hint, children }: { label: string; name: string; hint?: string; children: ReactNode }) {
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

function Phone({ base }: { base: string }) {
  const { register } = useFormContext();
  return (
    <div className="phone">
      <select aria-label="Prefijo del país" {...register(`${base}prefijo`)}>
        {prefijos.map((p) => <option key={p.v} value={p.v}>{p.t}</option>)}
      </select>
      <input inputMode="tel" autoComplete="tel-national" placeholder="987 654 321" {...aria(`${base}whatsapp`)} {...register(`${base}whatsapp`)} />
    </div>
  );
}

function Choice({ name, value, title, text }: { name: string; value: string; title: string; text?: string }) {
  const { register } = useFormContext();
  return (
    <label className="choice">
      <input type="radio" value={value} {...register(name)} />
      <span className="choice-body"><span className="choice-title">{title}</span>{text && <span className="choice-text">{text}</span>}</span>
    </label>
  );
}

/* ---------- acceso ---------- */
/* ---------- pasos ---------- */
const stepFields: Record<string, string[]> = {
  modo: ["modo"],
  datos: ["nombres", "apellidos", "tipoDocumento", "numeroDocumento", "prefijo", "whatsapp", "fechaNacimiento", "tipoInstitucion", "institucion", "carrera", "ciclo", "nivelDatos", "areasInteres", "comoSeEntero"],
  equipo: ["nombreEquipo", "track"],
  individual: ["track", "pideEquipo"],
  integrantes: ["integrantes"],
  resumen: ["declaracionRequisitos", "consentimientoDatos", "aceptaBases"],
};

function StepModo() {
  return (
    <fieldset className="grid gap-0">
      <legend className="sr-only">Modo de postulación</legend>
      <Choice name="modo" value="equipo" title="Postular en equipo" text="De 2 a 4 personas contándote a ti. Tú creas la cuenta y registras a las demás." />
      <Choice name="modo" value="individual" title="Postular individualmente" text="Postulas solo. Si quieres, la organización te asigna un equipo." />
      <ModoError />
    </fieldset>
  );
}
function ModoError() {
  const { formState } = useFormContext();
  const e = formState.errors.modo?.message as string | undefined;
  return e ? <p className="err mt-3" role="alert">{e}</p> : null;
}

function StepDatos() {
  const { register, watch } = useFormContext<PostulacionForm>();
  const tipoDoc = watch("tipoDocumento");
  const areasSel = watch("areasInteres") ?? [];
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Field label="Nombres" name="nombres"><input autoComplete="given-name" {...aria("nombres")} {...register("nombres")} /></Field>
      <Field label="Apellidos" name="apellidos"><input autoComplete="family-name" {...aria("apellidos")} {...register("apellidos")} /></Field>
      <Field label="Tipo de documento" name="tipoDocumento">
        <select {...aria("tipoDocumento")} {...register("tipoDocumento")}><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select>
      </Field>
      <Field label="Número de documento" name="numeroDocumento" hint={tipoDoc === "DNI" ? "8 dígitos" : tipoDoc === "CE" ? "9 a 12 caracteres" : "6 a 12 caracteres"}>
        <input inputMode={tipoDoc === "DNI" ? "numeric" : "text"} {...aria("numeroDocumento", true)} {...register("numeroDocumento")} />
      </Field>
      <Field label="WhatsApp" name="whatsapp"><Phone base="" /></Field>
      <Field label="Fecha de nacimiento" name="fechaNacimiento" hint="Debes tener 18 años o más."><input type="date" autoComplete="bday" {...aria("fechaNacimiento", true)} {...register("fechaNacimiento")} /></Field>
      <Field label="Tipo de institución" name="tipoInstitucion">
        <select {...aria("tipoInstitucion")} {...register("tipoInstitucion")}><option value="">Elige una opción</option><option value="universidad">Universidad</option><option value="instituto">Instituto</option></select>
      </Field>
      <Field label="Institución" name="institucion" hint="Elige de la lista o escribe la tuya.">
        <input list="instituciones" autoComplete="off" {...aria("institucion", true)} {...register("institucion")} />
        <datalist id="instituciones">{instituciones.map((i) => <option key={i} value={i} />)}</datalist>
      </Field>
      <Field label="Carrera" name="carrera"><input {...aria("carrera")} {...register("carrera")} /></Field>
      <Field label="Ciclo" name="ciclo">
        <select {...aria("ciclo")} {...register("ciclo")}><option value="">Elige tu ciclo</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
      </Field>
      <Field label="Tu nivel con los datos" name="nivelDatos">
        <select {...aria("nivelDatos")} {...register("nivelDatos")}><option value="">Elige una opción</option><option value="ninguno">Ninguno, estoy empezando</option><option value="basico">Básico</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option></select>
      </Field>
      <Field label="¿Cómo te enteraste de Data League?" name="comoSeEntero">
        <select {...aria("comoSeEntero")} {...register("comoSeEntero")}><option value="">Elige una opción</option>{comoSeEntero.map((o) => <option key={o}>{o}</option>)}</select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Áreas que te interesan" name="areasInteres" hint="Elige las que quieras.">
          <div className="chips" role="group" aria-label="Áreas de interés">
            {areas.map((a) => (
              <label key={a} className={`chip ${areasSel.includes(a) ? "on" : ""}`}><input type="checkbox" value={a} {...register("areasInteres")} />{a}</label>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

function TrackPicker() {
  return (
    <fieldset>
      <legend className="mb-3 font-bold text-ink">Track</legend>
      {tracks.map((t) => <Choice key={t.id} name="track" value={t.id} title={`${t.id} · ${t.nombre}`} text={t.descripcion} />)}
      <TrackError />
    </fieldset>
  );
}
function TrackError() {
  const { formState } = useFormContext();
  const e = formState.errors.track?.message as string | undefined;
  return e ? <p className="err mt-3" role="alert">{e}</p> : null;
}

function StepEquipo() {
  const { register } = useFormContext<PostulacionForm>();
  return (
    <div className="grid gap-10">
      <div className="max-w-lg"><Field label="Nombre del equipo" name="nombreEquipo"><input {...aria("nombreEquipo")} {...register("nombreEquipo")} /></Field></div>
      <TrackPicker />
    </div>
  );
}

function StepIndividual() {
  const { formState } = useFormContext();
  const e = formState.errors.pideEquipo?.message as string | undefined;
  return (
    <div className="grid gap-10">
      <TrackPicker />
      <fieldset>
        <legend className="mb-3 font-bold text-ink">¿Quieres que la organización te asigne un equipo?</legend>
        <Choice name="pideEquipo" value="si" title="Sí, asígnenme un equipo" />
        <Choice name="pideEquipo" value="no" title="No, prefiero participar solo" />
        {e && <p className="err mt-3" role="alert">{e}</p>}
      </fieldset>
    </div>
  );
}

function StepIntegrantes() {
  const { control, register, formState } = useFormContext<PostulacionForm>();
  const { fields, append, remove } = useFieldArray({ control, name: "integrantes" });
  const arrErr = (formState.errors.integrantes as { message?: string; root?: { message?: string } } | undefined);
  return (
    <div className="grid gap-8">
      <p className="measure text-xl text-ink">Tú ya cuentas como una persona. Agrega de 1 a 3 más. No necesitan crear cuenta: les avisaremos por correo.</p>
      {fields.map((f, i) => (
        <fieldset key={f.id} className="member">
          <legend className="display text-2xl">Integrante {i + 1}</legend>
          <div className="grid gap-6 md:grid-cols-2">
            <Field label="Nombres" name={`integrantes.${i}.nombres`}><input {...aria(`integrantes.${i}.nombres`)} {...register(`integrantes.${i}.nombres`)} /></Field>
            <Field label="Apellidos" name={`integrantes.${i}.apellidos`}><input {...aria(`integrantes.${i}.apellidos`)} {...register(`integrantes.${i}.apellidos`)} /></Field>
            <Field label="Correo" name={`integrantes.${i}.correo`}><input type="email" autoComplete="off" {...aria(`integrantes.${i}.correo`)} {...register(`integrantes.${i}.correo`)} /></Field>
            <Field label="WhatsApp" name={`integrantes.${i}.whatsapp`}><Phone base={`integrantes.${i}.`} /></Field>
          </div>
          <button type="button" className="link-btn" onClick={() => remove(i)}>Quitar a esta persona</button>
        </fieldset>
      ))}
      {fields.length < 3 && (
        <button type="button" className="btn btn-ghost w-fit" onClick={() => append({ nombres: "", apellidos: "", correo: "", prefijo: "+51", whatsapp: "" })}>
          {fields.length === 0 ? "Agregar una persona" : "Agregar otra persona"}
        </button>
      )}
      {(arrErr?.message || arrErr?.root?.message) && <p className="err" role="alert">{arrErr.message ?? arrErr.root?.message}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="sum-row"><dt>{k}</dt><dd>{v}</dd></div>;
}

function StepResumen() {
  const { watch, register, formState } = useFormContext<PostulacionForm>();
  const v = watch();
  const track = tracks.find((t) => t.id === v.track);
  const e = formState.errors;
  return (
    <div className="grid gap-10">
      <dl className="summary">
        <Row k="Modo" v={v.modo === "equipo" ? `En equipo: ${v.nombreEquipo ?? ""}` : "Individual"} />
        <Row k="Track" v={track ? `${track.id} · ${track.nombre}` : "—"} />
        <Row k="Nombre" v={`${v.nombres} ${v.apellidos}`} />
        <Row k="Documento" v={`${v.tipoDocumento} ${v.numeroDocumento}`} />
        <Row k="Contacto" v={`${v.correoLider} · ${v.prefijo} ${v.whatsapp}`} />
        <Row k="Estudios" v={`${v.carrera}, ciclo ${v.ciclo} · ${v.institucion}`} />
        {v.modo === "equipo"
          ? v.integrantes.map((m, i) => <Row key={i} k={`Integrante ${i + 1}`} v={`${m.nombres} ${m.apellidos} · ${m.correo}`} />)
          : <Row k="Equipo" v={v.pideEquipo === "si" ? "Quiere que le asignen uno" : "Participa solo"} />}
      </dl>
      <div className="grid gap-5">
        {([
          ["declaracionRequisitos", v.modo === "equipo" ? "Declaro que todas las personas de mi equipo son estudiantes activos de pregrado, universitario o de instituto, tienen 18 años o más y autorizaron que comparta sus datos." : "Declaro que soy estudiante activo de pregrado, universitario o de instituto, y tengo 18 años o más."],
          ["consentimientoDatos", "Doy mi consentimiento para que Data League trate los datos de esta postulación con el fin de organizar el evento."],
          ["aceptaBases", "He leído y acepto las bases del concurso."],
        ] as const).map(([name, text]) => (
          <div key={name}>
            <label className="check"><input type="checkbox" {...register(name)} /><span>{text}</span></label>
            {e[name]?.message && <p className="err mt-2" role="alert">{String(e[name]?.message)}</p>}
          </div>
        ))}
        <p className="text-muted text-[0.95rem]">La política de privacidad y las bases completas se publicarán en esta web. Guardamos la versión de los textos que aceptas ({"2026-11-08"}).</p>
      </div>
    </div>
  );
}

function TeamAsideSlot() {
  return <div className="md:order-2"><TeamAside /></div>;
}

function TeamAside() {
  const { watch } = useFormContext<PostulacionForm>();
  const modo = watch("modo");
  const ints = watch("integrantes") ?? [];
  const pide = watch("pideEquipo") === "si";
  if (!modo) return null;
  const members = modo === "equipo" ? ints.map((m) => (m?.nombres?.trim()[0] ?? "·").toUpperCase()) : [];
  return (
    <aside className="mb-8 md:sticky md:top-8 md:mb-0 md:self-start" aria-label="Vista de tu equipo">
      <div className="mx-auto w-48 md:w-full"><TeamNet members={members} ghost={modo === "individual" && pide} /></div>
      <p className="mt-2 text-center text-[0.95rem] text-muted">
        {modo === "individual" ? (pide ? "Te asignaremos un equipo." : "Participas solo.") : members.length === 0 ? "Agrega a tu equipo en el paso de integrantes." : `Tu equipo: ${members.length + 1} personas.`}
      </p>
    </aside>
  );
}

/* ---------- página ---------- */
const DEFAULTS: Partial<PostulacionForm> = {
  tipoDocumento: "DNI", prefijo: "+51", areasInteres: [], integrantes: [],
  declaracionRequisitos: undefined, consentimientoDatos: undefined, aceptaBases: undefined,
};

export default function Postular() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const topRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);

  const methods = useForm<PostulacionForm, unknown, PostulacionData>({
    resolver: zodResolver(postulacionSchema), defaultValues: DEFAULTS as PostulacionForm, mode: "onTouched", shouldUnregister: false,
  });
  const modo = methods.watch("modo");
  const steps = useMemo(() => (modo === "individual" ? ["modo", "datos", "individual", "resumen"] : ["modo", "datos", "equipo", "integrantes", "resumen"]), [modo]);
  const labels: Record<string, string> = { modo: "Cómo postulas", datos: "Tus datos", equipo: "Equipo y track", individual: "Track", integrantes: "Integrantes", resumen: "Resumen" };
  const current = steps[Math.min(step, steps.length - 1)];

  // Si ya postuló, va a su área (RF-AUT-04).
  useEffect(() => {
    if (!user) { setChecking(false); return; }
    void existePostulacion(user.uid).then((ya) => { if (ya) navigate("/mi-postulacion", { replace: true }); else setChecking(false); });
  }, [user, navigate]);

  // Borrador en el navegador (RF-POS-10).
  const draftKey = user ? `dl-draft-${user.uid}` : "";
  useEffect(() => {
    if (!user || restored.current) return;
    restored.current = true;
    methods.setValue("correoLider", (user.email ?? "").toLowerCase());
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw) as { values: Partial<PostulacionForm>; step: number };
        methods.reset({ ...DEFAULTS, ...d.values, correoLider: (user.email ?? "").toLowerCase() } as PostulacionForm);
        setStep(d.step ?? 0);
      }
    } catch { /* sin borrador */ }
  }, [user, draftKey, methods]);
  useEffect(() => {
    if (!user) return;
    const sub = methods.watch((values) => {
      try {
        const { declaracionRequisitos, consentimientoDatos, aceptaBases, ...rest } = values as PostulacionForm;
        void declaracionRequisitos; void consentimientoDatos; void aceptaBases;
        localStorage.setItem(draftKey, JSON.stringify({ values: rest, step }));
      } catch { /* almacenamiento no disponible */ }
    });
    return () => sub.unsubscribe();
  }, [methods, user, draftKey, step]);

  useEffect(() => { topRef.current?.focus(); window.scrollTo({ top: 0 }); }, [step]);

  async function next() {
    const fields = stepFields[current] as (keyof PostulacionForm)[];
    const ok = await methods.trigger(fields, { shouldFocus: true });
    const extra = crossIssues(methods.getValues()).filter((i) => (fields as string[]).includes(String(i.path[0])));
    extra.forEach((i, n) => methods.setError(i.path.join(".") as never, { type: "custom", message: i.message }, { shouldFocus: n === 0 }));
    if (ok && extra.length === 0) setStep((s) => Math.min(s + 1, steps.length - 1));
  }

  async function submit(values: PostulacionData) {
    if (!user) return;
    setSubmitting(true); setFormError("");
    try {
      await enviarPostulacion(user, values);
      try { localStorage.removeItem(draftKey); } catch { /* nada */ }
      navigate("/mi-postulacion", { state: { enviada: true } });
    } catch (e) {
      if (e instanceof CorreoRepetido) setFormError(`El correo ${e.correo} ya está inscrito en otro equipo. Cada persona solo puede estar en uno; cambia ese correo o avísale a esa persona.`);
      else if ((e as { code?: string }).code === "permission-denied") setFormError("No pudimos guardar tu postulación. Puede que las postulaciones hayan cerrado o que algún dato no cumpla las reglas. Revisa los pasos anteriores.");
      else setFormError("Algo falló al enviar. Revisa tu conexión e inténtalo de nuevo; tus datos siguen guardados.");
    } finally { setSubmitting(false); }
  }

  const cerrada = postulacionCerrada();

  return (
    <Shell>
      <div className="wrap py-10 md:py-16">
        {!firebaseConfigured ? (
          <p className="text-xl text-ink">Falta configurar Firebase (variables <code>VITE_FIREBASE_*</code>, ver <code>.env.example</code>).</p>
        ) : cerrada ? (
          <div>
            <h1 className="display h-xl">Postulaciones cerradas</h1>
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
           <div className="md:grid md:grid-cols-[minmax(0,1fr)_16rem] md:gap-14">
            <TeamAsideSlot />
            <div>
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <p className="text-soft">Sesión: <b className="text-ink">{user.email}</b> · <button type="button" className="link-btn" onClick={() => void signOut()}>Cerrar sesión</button></p>
              <p className="font-bold text-accent">Cierra el 29 de noviembre, 23:59</p>
            </div>
            <ol className="stepper" aria-label="Pasos">
              {steps.map((s, i) => (
                <li key={s} className={i < step ? "done" : i === step ? "now" : ""} aria-current={i === step ? "step" : undefined}><span className="n" aria-hidden="true" /><span className="l">{labels[s]}</span></li>
              ))}
            </ol>
            <h1 ref={topRef} tabIndex={-1} className="display h-lg mt-10 outline-none">{labels[current]}</h1>
            <form className="mt-10" noValidate onSubmit={methods.handleSubmit(submit)}>
              {current === "modo" && <StepModo />}
              {current === "datos" && <StepDatos />}
              {current === "equipo" && <StepEquipo />}
              {current === "individual" && <StepIndividual />}
              {current === "integrantes" && <StepIntegrantes />}
              {current === "resumen" && <StepResumen />}
              {formError && <p className="err mt-8 text-lg" role="alert">{formError}</p>}
              <div className="mt-12 flex flex-wrap items-center gap-4">
                {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>Atrás</button>}
                {current !== "resumen"
                  ? <button type="button" className="btn" onClick={() => void next()}>Continuar</button>
                  : <button type="submit" className="btn" disabled={submitting}>{submitting ? "Enviando…" : "Enviar postulación"}</button>}
              </div>
            </form>
            </div>
           </div>
          </FormProvider>
        )}
      </div>
    </Shell>
  );
}
