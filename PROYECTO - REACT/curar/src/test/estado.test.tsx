import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CODIGO_DEMO, useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useFlujo } from '../context/FlujoContext';
import { useCatalogo } from '../queries/catalogo';
import { Proveedores, simularFetch } from './utilidades';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => vi.unstubAllGlobals());

describe('CitasProvider', () => {
  it('bloquea envíos duplicados mientras hay una solicitud en curso', async () => {
    const borrador = { dniPaciente: '12345678', medicoId: 'm1', seguro: 'SIS' as const, fecha: '2026-11-02', hora: '09:30' };
    const peticiones = simularFetch(() => ({ ...borrador, id: '9', estado: 'Pendiente' }));
    const { result } = renderHook(() => useCitas(), { wrapper: Proveedores });

    act(() => {
      result.current.reservar(borrador, () => undefined);
      result.current.reservar(borrador, () => undefined);
    });
    await waitFor(() => expect(result.current.total).toBe(1));

    expect(peticiones.filter((p) => p.metodo === 'POST')).toHaveLength(1);
    expect(result.current.guardando).toBe(false);
  });

  it('calcula valores derivados sin duplicar estado', async () => {
    const medicos = [
      { id: 'a', nombre: 'A', especialidad: 'X', calificacion: 4, centro: 'c', horario: [] },
      { id: 'b', nombre: 'B', especialidad: 'X', calificacion: 4, centro: 'c', horario: [], estado: 'Inactivo' },
    ];
    simularFetch(() => medicos);
    // Lab 14: los médicos viven en TanStack Query; `activos` se deriva con `select`, sin guardarse aparte.
    const { result } = renderHook(() => useCatalogo(), { wrapper: Proveedores });
    await waitFor(() => expect(result.current.medicos).toHaveLength(2));
    expect(result.current.activos.map((m) => m.id)).toEqual(['a']);
  });

  it('muestra un mensaje legible cuando la API no responde', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('red caída'))));
    const { result } = renderHook(() => useCitas(), { wrapper: Proveedores });
    act(() => result.current.cargarCitas('12345678'));
    await waitFor(() => expect(result.current.error).toContain('No se pudo contactar la API'));
  });
});

describe('AuthProvider', () => {
  it('rechaza un código incorrecto y expone el código de demostración', async () => {
    simularFetch(() => []);
    const { result } = renderHook(() => useAuth(), { wrapper: Proveedores });
    await expect(result.current.verificar('000000')).resolves.toBe(false);
    expect(CODIGO_DEMO).toBe('123456');
  });

  it('registrar() devuelve false si el DNI ya existe', async () => {
    simularFetch(() => [{ dni: '12345678', nombre: 'Ana', rol: 1, password: 'x' }]);
    const { result } = renderHook(() => useAuth(), { wrapper: Proveedores });
    const ok = await result.current.registrar({ dni: '12345678', nombre: 'Ana', correo: 'a@b.pe', telefono: '912345678', password: 'abc12345', rol: 1 });
    expect(ok).toBe(false);
  });

  it('ingresar() abre la sesión y inicio() apunta al panel del rol sin esperar al re-render', async () => {
    simularFetch(() => [{ id: '1', dni: '87654321', nombre: 'Dra. Pérez', rol: 2, password: 'abc12345', medicoId: 'm1', verificado: true }]);
    const { result } = renderHook(() => useAuth(), { wrapper: Proveedores });

    let resultado: string | undefined;
    await act(async () => {
      resultado = await result.current.ingresar('87654321', 'abc12345');
    });

    expect(resultado).toBe('ok');
    expect(result.current.usuario?.nombre).toBe('Dra. Pérez');
    expect(result.current.inicio()).toBe('/panel-medico');
    expect(JSON.parse(localStorage.getItem('curar_sesion_activa') ?? 'null')).toMatchObject({ dni: '87654321', rol: 2 });
  });

  it('ingresar() informa credenciales inválidas y cuentas sin verificar', async () => {
    simularFetch(() => [{ id: '1', dni: '11111111', nombre: 'Luis', rol: 1, password: 'abc12345', verificado: false }]);
    const { result } = renderHook(() => useAuth(), { wrapper: Proveedores });
    await expect(result.current.ingresar('11111111', 'incorrecta')).resolves.toBe('error');
    await expect(result.current.ingresar('11111111', 'abc12345')).resolves.toBe('pendiente');
    expect(result.current.usuario).toBeNull();
  });
});

describe('FlujoProvider', () => {
  it('el flujo de reserva empieza vacío y fusiona cambios sin mutar', () => {
    const { result } = renderHook(() => useFlujo(), { wrapper: Proveedores });
    expect(result.current.flujo.seguro).toBeNull();
    expect(result.current.flujo.sede).toBeNull();

    const antes = result.current.flujo;
    act(() => result.current.actualizarFlujo({ seguro: 'SIS' }));
    expect(result.current.flujo.seguro).toBe('SIS');
    expect(result.current.flujo).not.toBe(antes);
    expect(antes.seguro).toBeNull();
  });
});
