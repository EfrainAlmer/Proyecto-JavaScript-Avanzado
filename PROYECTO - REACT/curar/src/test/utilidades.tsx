import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router';
import { vi } from 'vitest';
import App from '../App';
import { AuthProvider } from '../context/AuthContext';
import { FlujoProvider } from '../context/FlujoContext';
import { crearClienteConsultas } from '../queries/cliente';

/** Proveedores globales para probar hooks y componentes. */
export function Proveedores({ children }: { readonly children: ReactNode }) {
  // Caché nueva por prueba: ningún dato se filtra de una prueba a otra.
  const [consultas] = useState(crearClienteConsultas);
  return (
    <QueryClientProvider client={consultas}>
    <AuthProvider>
      <FlujoProvider>
        {children}
      </FlujoProvider>
    </AuthProvider>
    </QueryClientProvider>
  );
}

export interface PeticionFalsa {
  readonly url: string;
  readonly metodo: string;
  readonly cuerpo: unknown;
}

/** Sustituye fetch: `respuestas` decide qué devolver y `peticiones` registra cada llamada. */
export function simularFetch(respuestas: (p: PeticionFalsa) => unknown) {
  const peticiones: PeticionFalsa[] = [];
  const falso = vi.fn((url: string, init?: RequestInit) => {
    const peticion: PeticionFalsa = { url, metodo: init?.method ?? 'GET', cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined };
    peticiones.push(peticion);
    const datos = respuestas(peticion);
    return Promise.resolve(new Response(JSON.stringify(datos), { status: 200 }));
  });
  vi.stubGlobal('fetch', falso);
  return peticiones;
}

/** Monta la app completa en una ruta y expone la ruta actual (sustituye a createMemoryRouter). */
export function montarApp(ruta: string) {
  const actual = { pathname: ruta };
  function Sonda() {
    actual.pathname = useLocation().pathname;
    return null;
  }
  render(
    <QueryClientProvider client={crearClienteConsultas()}>
      <MemoryRouter initialEntries={[ruta]}>
        <App />
        <Sonda />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return actual;
}
