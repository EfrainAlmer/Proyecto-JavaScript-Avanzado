import { useDebugValue, useSyncExternalStore } from 'react';

/**
 * Lab 13 · useSyncExternalStore + useDebugValue.
 * `navigator.onLine` es una FUENTE EXTERNA a React que cambia sola (eventos online/offline).
 * useSyncExternalStore la lee de forma consistente en cada render y se suscribe/desuscribe por nosotros;
 * un useState + useEffect podría mostrar un valor desfasado entre la lectura y la suscripción.
 *
 * Límite honesto: onLine = true solo significa "hay red", no que la API responda (json-server apagado
 * sigue siendo un ApiError('network'). Este indicador complementa a los mensajes de error, no los sustituye.
 */
function suscribir(avisar: () => void): () => void {
  window.addEventListener('online', avisar);
  window.addEventListener('offline', avisar);
  return () => {
    window.removeEventListener('online', avisar);
    window.removeEventListener('offline', avisar);
  };
}

const leer = (): boolean => navigator.onLine;
const leerEnServidor = (): boolean => true; // sin navegador (SSR/pruebas sin window) se asume conexión

export function useConexion(): boolean {
  const enLinea = useSyncExternalStore(suscribir, leer, leerEnServidor);
  useDebugValue(enLinea ? 'En línea' : 'Sin conexión'); // etiqueta visible en React DevTools › Components › Layout
  return enLinea;
}
