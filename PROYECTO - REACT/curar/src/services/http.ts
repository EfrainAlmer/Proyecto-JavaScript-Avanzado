/** Error HTTP propio: status 0 significa que la red o el servidor no respondieron. */
export class HttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function http<T>(metodo: Metodo, url: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      ...(cuerpo === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
    });
  } catch {
    throw new HttpError(0);
  }
  if (!respuesta.ok) throw new HttpError(respuesta.status);
  const texto = await respuesta.text();
  return (texto === '' ? undefined : JSON.parse(texto)) as T;
}
