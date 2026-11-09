import type { Jornada } from "../config";

/**
 * Marco del flyer de la jornada. Los flyers los ponen los organizadores: se agrega la imagen en `public/flyers/`
 * y se indica en `flyer` dentro de src/config.ts. Mientras no haya imagen se muestra solo el marco.
 */
export default function Flyer({ e }: { e: Jornada }) {
  return (
    <figure className="flyer">
      {e.flyer
        ? <img src={e.flyer} alt={`Flyer de la jornada: ${e.tema}`} />
        : <div className="flyer-vacio" role="img" aria-label="Flyer de la jornada, aún sin publicar"><span>Flyer</span></div>}
      {e.flyer && <a className="link-btn mt-3 inline-block" href={e.flyer} download={`data-league-${e.id ?? e.fecha}`}>Descargar flyer</a>}
    </figure>
  );
}
