import { mensajeHttp } from './mensajeHttp';

export type Salida<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false };

/** Patrón común: marca carga, limpia el error y traduce los fallos HTTP a un mensaje. */
export async function ejecutar<T>(
  promesa: Promise<T>,
  setCargando: (valor: boolean) => void,
  setError: (mensaje: string) => void,
): Promise<Salida<T>> {
  setCargando(true);
  setError('');
  try {
    return { ok: true, valor: await promesa };
  } catch (e) {
    setError(mensajeHttp(e));
    return { ok: false };
  } finally {
    setCargando(false);
  }
}
