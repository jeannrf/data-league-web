import type { ReactNode } from "react";
import { Link } from "react-router";

/** Marco simple para las páginas de trabajo (formulario y área del postulante). */
export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh">
      <header className="border-b border-line">
        <div className="wrap flex items-center justify-between py-5">
          <Link to="/" aria-label="Data League, inicio" className="display text-2xl no-underline">
            <span>Data </span><span className="text-primary">League</span>
          </Link>
          <Link to="/" className="text-soft no-underline hover:text-accent">Volver al inicio</Link>
        </div>
      </header>
      <main id="contenido">{children}</main>
    </div>
  );
}
