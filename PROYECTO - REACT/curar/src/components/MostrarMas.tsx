import type { Paginado } from '../hooks/usePaginado';

interface MostrarMasProps {
  readonly paginado: Paginado<unknown>;
  /** Sustantivo en plural: "citas", "médicos"… */
  readonly unidad: string;
}

/** Pie de una lista paginada: cuántos se ven de cuántos y el botón para cargar el siguiente bloque. */
export function MostrarMas({ paginado: { visibles, total, restantes, porPagina, mostrarMas }, unidad }: MostrarMasProps) {
  if (total === 0) return null;
  return (
    <div className="mostrar-mas">
      <p role="status">Se muestran {visibles.length} de {total} {unidad}.</p>
      {restantes > 0 && (
        <button className="btn ghost" type="button" onClick={mostrarMas}>Mostrar {Math.min(porPagina, restantes)} más</button>
      )}
    </div>
  );
}
