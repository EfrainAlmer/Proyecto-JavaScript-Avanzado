import { ApiError, esCancelacion } from './contract';

/** Traduce cualquier fallo de la API a un mensaje para la persona usuaria. */
export function mensajeHttp(e: unknown): string {
  if (esCancelacion(e)) return 'Consulta cancelada. Pulsa Actualizar.';
  if (!(e instanceof ApiError)) return 'Ocurrió un error inesperado.';
  switch (e.kind) {
    case 'network':
      return 'No se pudo contactar la API. Revisa el servidor y vuelve a intentar.';
    case 'timeout':
      return 'La API tardó demasiado en responder. Vuelve a intentar.';
    case 'format':
      return 'La API respondió con datos que no cumplen el contrato esperado.';
    case 'http': {
      const s = e.status ?? 0;
      if (s === 404) return 'El registro ya no existe.';
      if (s === 409) return 'Hubo un conflicto con otro cambio. Recarga e intenta de nuevo.';
      if (s >= 500) return 'La API falló. Intenta más tarde.';
      return `La API rechazó la solicitud (estado ${s}).`;
    }
  }
}
