import type { ReactNode } from "react";
import { Link } from "react-router";

/** Marco simple para las páginas de trabajo (formulario y área del postulante). */
export default function Shell({ children, volver = true }: { children: ReactNode; volver?: boolean }) {
  return (
    <div className="min-h-svh">
      <header className="border-b border-line">
        <div className="wrap flex items-center justify-between gap-4 py-5">
          <Link to="/" aria-label="Data League, inicio" className="display text-2xl no-underline">
            <span>Data </span><span className="text-primary">League</span>
          </Link>
          {volver && <Link to="/" className="whitespace-nowrap py-2 text-soft no-underline hover:text-accent">Volver al inicio</Link>}
        </div>
      </header>
      <main id="contenido">{children}</main>
    </div>
  );
}
