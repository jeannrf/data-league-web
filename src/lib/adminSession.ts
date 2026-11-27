import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import { adminAuth } from "./firebase";
import { ADMIN_EMAIL } from "../config";

/** Sesión del panel de administración, separada de la cuenta personal (ver adminAuth en firebase.ts). */
export function useAdminSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(adminAuth));
  useEffect(() => {
    if (!adminAuth) return;
    return onAuthStateChanged(adminAuth, (u) => { setUser(u?.email === ADMIN_EMAIL ? u : null); setLoading(false); });
  }, []);
  return { user, loading };
}

/** Entra al panel con la contraseña de administración. Devuelve un mensaje de error o null. */
export async function entrarAdmin(password: string): Promise<string | null> {
  if (!adminAuth) return "Falta configurar Firebase.";
  try { await signInWithEmailAndPassword(adminAuth, ADMIN_EMAIL, password); return null; }
  catch (e) {
    const code = (e as { code?: string }).code ?? "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found" || code === "auth/invalid-email") return "Contraseña incorrecta.";
    if (code === "auth/too-many-requests") return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    if (code === "auth/operation-not-allowed") return "Falta activar «Correo electrónico/contraseña» en Firebase (Authentication > Sign-in method).";
    if (code === "auth/network-request-failed") return "Sin conexión. Revisa tu internet e inténtalo de nuevo.";
    return "No pudimos iniciar sesión. Inténtalo de nuevo.";
  }
}

export async function salirAdmin() { if (adminAuth) await signOut(adminAuth); }
