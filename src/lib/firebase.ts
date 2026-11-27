import { initializeApp } from "firebase/app";
import { browserSessionPersistence, connectAuthEmulator, getAuth, initializeAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

const config = useEmulators
  ? { apiKey: "demo", authDomain: "localhost", projectId: "demo-data-league", appId: "demo" }
  : {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
    };

/** true con VITE_USE_EMULATORS=true: la web usa los emuladores locales, no tu proyecto de Firebase. */
export const usingEmulators = useEmulators;

/** false si faltan las variables VITE_FIREBASE_* (ver .env.example). */
export const firebaseConfigured = useEmulators || Boolean(config.apiKey && config.projectId);

const app = firebaseConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

if (useEmulators && auth && db) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

/**
 * Sesión aparte para el panel /admin: la contraseña de administración abre solo esa vista y no reemplaza
 * la cuenta personal con la que se navega el resto de la web. Dura lo que la pestaña (sessionStorage).
 */
const adminApp = firebaseConfigured ? initializeApp(config, "admin") : null;
export const adminAuth = adminApp ? initializeAuth(adminApp, { persistence: browserSessionPersistence }) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;

if (useEmulators && adminAuth && adminDb) {
  connectAuthEmulator(adminAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(adminDb, "127.0.0.1", 8080);
}
