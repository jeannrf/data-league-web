import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./lib/auth";
import Landing from "./pages/Landing";
import Postular from "./pages/Postular";
import MiPostulacion from "./pages/MiPostulacion";
import Sponsor from "./pages/Sponsor";
import Mentor from "./pages/Mentor";
import Admin from "./pages/Admin";
import Eventos from "./pages/Eventos";
import Cuenta from "./pages/Cuenta";
const Tipografias = lazy(() => import("./pages/Tipografias"));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/postular" element={<Postular />} />
          <Route path="/mi-postulacion" element={<MiPostulacion />} />
          <Route path="/sponsor" element={<Sponsor />} />
          <Route path="/mentor" element={<Mentor />} />
          <Route path="/eventos" element={<Eventos />} />
          <Route path="/cuenta" element={<Cuenta />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/tipografias" element={<Suspense fallback={null}><Tipografias /></Suspense>} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
