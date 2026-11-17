import { HttpErrorResponse } from '@angular/common/http';
export function mensajeHttp(e: unknown): string {
  if (!(e instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado.';
  if (e.status === 0) return 'No se pudo contactar la API. Revisa el servidor y vuelve a intentar.';
  if (e.status === 404) return 'El registro ya no existe.';
  if (e.status >= 500) return 'La API falló. Intenta más tarde.';
  return `La API rechazó la solicitud (estado ${e.status}).`;
}
