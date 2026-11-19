import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { claves } from '../queries/claves';
import { crearClienteConsultas } from '../queries/cliente';
import { useCatalogo, useMedico } from '../queries/catalogo';
import type { Medico } from '../types/cita';

const medico = (id: string, nombre = 'Ana'): Medico => ({ id, nombre, especialidad: 'X', calificacion: 4, centro: 'c', horario: [] });

function conCache() {
  const cache = crearClienteConsultas();
  const envoltorio = ({ children }: { readonly children: ReactNode }) => <QueryClientProvider client={cache}>{children}</QueryClientProvider>;
  return { cache, envoltorio };
}

afterEach(() => vi.unstubAllGlobals());

describe('TanStack Query (Lab 14)', () => {
  it('varios consumidores del mismo recurso comparten UNA petición (una sola caché)', async () => {
    const fetchFalso = vi.fn((url: string) => Promise.resolve(new Response(JSON.stringify(url.endsWith('/medicos') ? [medico('m1')] : []))));
    vi.stubGlobal('fetch', fetchFalso);
    const { envoltorio } = conCache();
    function Dos() {
      const a = useCatalogo();
      const b = useCatalogo();
      return <p>{a.medicos.length + b.medicos.length} médicos</p>;
    }
    render(<Dos />, { wrapper: envoltorio });
    expect(await screen.findByText('2 médicos')).toBeInTheDocument();
    expect(fetchFalso.mock.calls.filter(([u]) => u === '/api/medicos')).toHaveLength(1);
  });

  it('invalidar el prefijo ["medicos"] marca también los perfiles ["medicos", id]', async () => {
    const { cache } = conCache();
    cache.setQueryData(claves.medicos.todos, [medico('m1')]);
    cache.setQueryData(claves.medicos.detalle('m1'), medico('m1'));
    cache.setQueryData(claves.sedes, []);
    await cache.invalidateQueries({ queryKey: claves.medicos.todos });
    expect(cache.getQueryState(claves.medicos.todos)?.isInvalidated).toBe(true);
    expect(cache.getQueryState(claves.medicos.detalle('m1'))?.isInvalidated).toBe(true);
    expect(cache.getQueryState(claves.sedes)?.isInvalidated).toBe(false); // otro recurso: no se toca
  });

  it('el perfil muestra al instante el médico de la lista mientras llega su detalle (placeholderData)', async () => {
    const pendiente = Promise.withResolvers<Response>();
    vi.stubGlobal('fetch', vi.fn(() => pendiente.promise));
    const { cache, envoltorio } = conCache();
    cache.setQueryData(claves.medicos.todos, [medico('m1', 'Desde la lista')]);
    const { result } = renderHook(() => useMedico('m1'), { wrapper: envoltorio });
    expect(result.current.data?.nombre).toBe('Desde la lista');
    expect(result.current.isPlaceholderData).toBe(true);
    pendiente.resolve(new Response(JSON.stringify(medico('m1', 'Detalle actualizado'))));
    await waitFor(() => expect(result.current.data?.nombre).toBe('Detalle actualizado'));
  });

  it('pasa la señal de cancelación de TanStack Query al transporte', async () => {
    const fetchFalso = vi.fn((_u: string, _init?: RequestInit) => Promise.resolve(new Response('[]')));
    vi.stubGlobal('fetch', fetchFalso);
    const { envoltorio } = conCache();
    renderHook(() => useCatalogo(), { wrapper: envoltorio });
    await waitFor(() => expect(fetchFalso).toHaveBeenCalled());
    expect(fetchFalso.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });
});
