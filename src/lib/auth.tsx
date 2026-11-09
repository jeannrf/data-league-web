import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword as fbSignInPassword, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type User } from "firebase/auth";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import { ADMIN_EMAIL } from "../config";

// Solo con emuladores: permite a las pruebas automáticas iniciar sesión sin Google.
if (import.meta.env.VITE_USE_EMULATORS === "true" && auth) {
  const a = auth;
  (window as unknown as Record<string, unknown>).__dlTestSignIn = async (email: string) => {
    try { await createUserWithEmailAndPassword(a, email, "prueba-123456"); } catch { await signInWithEmailAndPassword(a, email, "prueba-123456"); }
    return a.currentUser?.uid ?? "";
  };
}

type Ctx = {
  user: User | null;
  loading: boolean;
  /** Abre Google. Devuelve un mensaje de error en español, o null si todo salió bien (o la persona cerró la ventana). */
  signInGoogle: () => Promise<string | null>;
  /** Acceso del panel de administración solo con la contraseña de administrador. Devuelve un mensaje de error o null. */
  signInAdmin: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  const value: Ctx = {
    user, loading,
    signInGoogle: async () => {
      if (!auth) return "Falta configurar Firebase.";
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(auth, provider);
        return null;
      } catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return null;
        // Algunos navegadores móviles bloquean la ventana emergente: se usa la redirección.
        if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
          await signInWithRedirect(auth, provider);
          return null;
        }
        if (code === "auth/unauthorized-domain") return `Firebase no tiene autorizado este dominio (${window.location.hostname}). Agrégalo en Authentication > Configuración > Dominios autorizados.`;
        if (code === "auth/operation-not-allowed") return "El inicio de sesión con Google no está activado en Firebase.";
        if (code === "auth/network-request-failed") return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
        return "No pudimos iniciar sesión con Google. Inténtalo de nuevo.";
      }
    },
    signInAdmin: async (password) => {
      if (!auth) return "Falta configurar Firebase.";
      try { await fbSignInPassword(auth, ADMIN_EMAIL, password); return null; }
      catch (e) {
        const code = (e as { code?: string }).code ?? "";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email") return "Contraseña incorrecta.";
        if (code === "auth/too-many-requests") return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
        if (code === "auth/operation-not-allowed") return "Falta activar «Correo electrónico/contraseña» en Firebase (Authentication > Sign-in method).";
        if (code === "auth/network-request-failed") return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
        return "No pudimos iniciar sesión. Inténtalo de nuevo.";
      }
    },
    signOut: async () => { if (auth) await fbSignOut(auth); },
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth fuera de AuthProvider");
  return c;
}
