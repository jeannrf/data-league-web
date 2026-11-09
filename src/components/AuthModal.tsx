import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { firebaseConfigured, usingEmulators } from "../lib/firebase";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Se llama cuando hay sesión iniciada con la ventana abierta. */
  onSignedIn: () => void;
  title?: string;
  text?: string;
};

/** Ventana para iniciar sesión con Google. Usa <dialog> nativo: atrapa el foco y se cierra con Escape. */
export default function AuthModal({ open, onClose, onSignedIn, title = "Inicia sesión para registrarte", text = "Usa tu cuenta de Google. Solo quien lidera el equipo (o quien postula solo) necesita iniciar sesión." }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const { user, loading, signInGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => { if (open && !loading && user) onSignedIn(); }, [open, loading, user, onSignedIn]);

  async function go() {
    setBusy(true); setMsg("");
    const err = await signInGoogle();
    if (err) setMsg(err);
    setBusy(false);
  }

  return (
    <dialog ref={ref} className="auth-modal" aria-labelledby="auth-title" onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="auth-box">
        <button type="button" className="auth-x" aria-label="Cerrar" onClick={onClose}>×</button>
        <h2 id="auth-title" className="title text-[clamp(1.75rem,5vw,2.5rem)]">{title}</h2>
        <p className="mt-4 text-ink">{text}</p>
        {firebaseConfigured ? (
          <button type="button" className="btn mt-8 w-full gap-3" disabled={busy || loading} onClick={() => void go()}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.5v5.4h7.1C42.7 36.6 45 30.9 45 24.5z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.4c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.6C8.1 41.1 15.4 46 24 46z" /><path fill="#FBBC05" d="M11.8 28.4c-.4-1.3-.7-2.7-.7-4.4s.3-3 .7-4.4v-5.6H4.5C3 17 2.2 20.4 2.2 24s.8 7 2.3 10l7.3-5.6z" /><path fill="#EA4335" d="M24 10.6c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14l7.3 5.6c1.7-5.2 6.5-9 12.2-9z" /></svg>
            {busy ? "Abriendo Google…" : "Continuar con Google"}
          </button>
        ) : (
          <p className="err mt-6">Falta configurar Firebase (ver docs/firebase-setup.md).</p>
        )}
        {usingEmulators && (
          <p className="mt-5 border-2 border-accent p-3 text-[0.9rem] text-ink" role="note">
            <b className="text-accent">Modo de pruebas local.</b> Esta web usa los emuladores, no tu proyecto de Firebase. Ejecuta <code>npm run emulators</code> en otra terminal; para usar tu proyecto real, quita <code>VITE_USE_EMULATORS=true</code> de <code>.env.local</code> y reinicia <code>npm run dev</code>.
          </p>
        )}
        {msg && <p role="alert" className="err mt-4">{msg}</p>}
        <p className="mt-6 text-[0.9rem] text-muted">Usaremos tu correo de Google solo para tu postulación. No publicamos nada en tu cuenta.</p>
      </div>
    </dialog>
  );
}
