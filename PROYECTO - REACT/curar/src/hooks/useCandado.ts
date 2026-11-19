import { useCallback, useRef } from 'react';

/**
 * Candado contra envíos duplicados (regla 3 del md). `mutation.isPending` desactiva el botón, pero solo
 * después del siguiente render; dos clics muy rápidos llegan antes. La referencia cambia al instante.
 */
export function useCandado() {
  const ocupado = useRef(false);
  return useCallback(async <T,>(accion: () => Promise<T>): Promise<T | undefined> => {
    if (ocupado.current) return undefined;
    ocupado.current = true;
    try {
      return await accion();
    } finally {
      ocupado.current = false;
    }
  }, []);
}
