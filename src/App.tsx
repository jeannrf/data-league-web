import { BrowserRouter, Route, Routes } from "react-router";
import { AuthProvider } from "./lib/auth";
import Landing from "./pages/Landing";
import Postular from "./pages/Postular";
import MiPostulacion from "./pages/MiPostulacion";
import Sponsor from "./pages/Sponsor";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/postular" element={<Postular />} />
          <Route path="/mi-postulacion" element={<MiPostulacion />} />
          <Route path="/sponsor" element={<Sponsor />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
