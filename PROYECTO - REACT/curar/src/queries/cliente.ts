import { QueryClient } from '@tanstack/react-query';

/**
 * Configuración de la caché (como en el md): sin reintentos automáticos —para que un fallo se vea y no se oculte
 * tras 3 intentos— y sin recargar al volver a la ventana o a la red (el panel médico lo hace a propósito, Lab 13).
 */
export function crearClienteConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false, staleTime: 30_000 },
      mutations: { retry: false },
    },
  });
}
