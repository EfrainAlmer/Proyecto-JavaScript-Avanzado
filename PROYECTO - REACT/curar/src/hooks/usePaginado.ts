import { useState } from 'react';

export interface Paginado<T> {
  readonly visibles: readonly T[];
  readonly total: number;
  readonly restantes: number;
  readonly porPagina: number;
  readonly mostrarMas: () => void;
}

/**
 * Muestra la lista por bloques ("Mostrar N más"). Con cientos de citas por médico, pintar todo de golpe
 * generaba páginas de más de 30 000 px.
 *
 * `clave` resume los filtros activos: si cambia, se vuelve al primer bloque. Se compara en el render
 * (estado derivado) en lugar de reiniciar con un useEffect, que pintaría primero el límite viejo.
 */
export function usePaginado<T>(lista: readonly T[], clave: string, porPagina = 20): Paginado<T> {
  const [pagina, setPagina] = useState({ clave, limite: porPagina });
  const limite = pagina.clave === clave ? pagina.limite : porPagina;
  const visibles = lista.length > limite ? lista.slice(0, limite) : lista;
  return {
    visibles,
    total: lista.length,
    restantes: lista.length - visibles.length,
    porPagina,
    mostrarMas: () => setPagina({ clave, limite: limite + porPagina }),
  };
}
