import { ApiError, errorCancelado, TIMEOUT } from './contract';

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Ejecuta `correr` con un límite de espera. Combina la señal de quien llama (p. ej. la de TanStack Query,
 * que cancela al cambiar de página) con `AbortSignal.timeout`, y traduce cuál de las dos abortó.
 */
export async function conLimite<T>(correr: (senal: AbortSignal) => Promise<T>, senal?: AbortSignal): Promise<T> {
  const limite = AbortSignal.timeout(TIMEOUT);
  const combinada = senal ? AbortSignal.any([senal, limite]) : limite;
  try {
    return await correr(combinada);
  } catch (error) {
    if (senal?.aborted) throw errorCancelado();
    if (limite.aborted) throw new ApiError('timeout');
    throw error;
  }
}

/**
 * Transporte único de la app (equivale a HttpClient + HttpInterceptor de Angular).
 * Devuelve `unknown`: quien llama DEBE validar la respuesta con el contrato (nunca un `as T`).
 */
export function http(metodo: Metodo, url: string, cuerpo?: unknown, senal?: AbortSignal): Promise<unknown> {
  return conLimite(async (activa) => {
    let respuesta: Response;
    try {
      respuesta = await fetch(url, {
        method: metodo,
        signal: activa,
        ...(cuerpo === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
      });
    } catch (error) {
      if (activa.aborted) throw error; // lo traduce conLimite (cancelación o tiempo agotado)
      throw new ApiError('network');
    }
    if (!respuesta.ok) throw new ApiError('http', respuesta.status);
    const texto = await respuesta.text();
    if (texto === '') return undefined;
    try {
      return JSON.parse(texto) as unknown;
    } catch {
      throw new ApiError('format');
    }
  }, senal);
}
