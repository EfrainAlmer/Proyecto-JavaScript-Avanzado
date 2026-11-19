import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePaginado } from '../hooks/usePaginado';
import type { Cita } from '../types/cita';
import { ordenarAgenda, porAtenderDesde } from '../utils/agenda';

const cita = (id: string, fecha: string, hora: string, estado: Cita['estado'] = 'Pendiente'): Cita =>
  ({ id, fecha, hora, estado, medicoId: 'm1', dniPaciente: '1', seguro: 'SIS' }) as Cita;

describe('orden de agenda', () => {
  const hoy = '2026-11-19';
  const citas = [cita('a', '2026-10-01', '09:00'), cita('b', '2026-11-20', '10:00'), cita('c', '2026-11-19', '08:00'), cita('d', '2026-11-05', '10:00')];

  it('pone primero lo próximo (ascendente) y después el historial (descendente), sin mutar la entrada', () => {
    const copia = [...citas];
    expect(ordenarAgenda(citas, hoy).map((c) => c.id)).toEqual(['c', 'b', 'd', 'a']);
    expect(citas).toEqual(copia);
  });

  it('el siguiente paciente nunca es una cita pasada ni cancelada', () => {
    const lista = [...citas, cita('e', '2026-11-19', '07:00', 'Cancelada')];
    expect(porAtenderDesde(lista, hoy).map((c) => c.id)).toEqual(['c', 'b']);
  });
});

describe('usePaginado', () => {
  const lista = Array.from({ length: 45 }, (_, i) => i);

  it('muestra bloques y vuelve al primero cuando cambia la clave de los filtros', () => {
    const { result, rerender } = renderHook(({ clave }) => usePaginado(lista, clave, 20), { initialProps: { clave: 'Todas' } });
    expect(result.current.visibles).toHaveLength(20);
    act(() => result.current.mostrarMas());
    expect(result.current.visibles).toHaveLength(40);
    expect(result.current.restantes).toBe(5);
    rerender({ clave: 'Pendiente' });
    expect(result.current.visibles).toHaveLength(20);
  });
});
