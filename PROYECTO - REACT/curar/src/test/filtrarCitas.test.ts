import { describe, expect, it } from 'vitest';
import type { Cita, Medico } from '../types/cita';
import { filtrarCitas, indexar } from '../utils/filtrarCitas';

const medicos: Medico[] = [
  { id: 'm1', nombre: 'Franco Espinola', especialidad: 'X', calificacion: 4, centro: 'c', horario: [], sedeId: 's1' },
  { id: 'm2', nombre: 'Rosa Linares', especialidad: 'X', calificacion: 4, centro: 'c', horario: [] },
];
// 3000 citas sintéticas: el mismo volumen que genera `npm run datos`.
const citas: Cita[] = Array.from({ length: 3000 }, (_, i) => ({
  id: `c${i}`, dniPaciente: String(10000000 + i), paciente: i % 3 === 0 ? 'Ana Torres' : 'Luis Ríos', medicoId: i % 2 ? 'm1' : 'm2',
  seguro: 'SIS', fecha: `2026-${String((i % 12) + 1).padStart(2, '0')}-10`, hora: '09:00', estado: i % 4 === 0 ? 'Cancelada' : 'Pendiente',
}));
const indice = indexar(medicos, [{ id: 's1', nombre: 'Hospital Central', tipo: 'Hospitales', direccion: '', seguros: [] }]);

describe('filtrarCitas', () => {
  it('filtra por texto (paciente, DNI o médico) y por estado', () => {
    expect(filtrarCitas(citas, { texto: 'ana', estado: 'Todas', orden: 'recientes' }, indice)).toHaveLength(1000);
    expect(filtrarCitas(citas, { texto: 'espinola', estado: 'Cancelada', orden: 'recientes' }, indice)).toHaveLength(0); // m1 = impares, nunca múltiplos de 4
    expect(filtrarCitas(citas, { texto: '10000004', estado: 'Todas', orden: 'recientes' }, indice).map((f) => f.cita.id)).toEqual(['c4']);
  });

  it('ordena por fecha en ambos sentidos sin mutar la entrada', () => {
    const copia = [...citas];
    const recientes = filtrarCitas(citas, { texto: '', estado: 'Todas', orden: 'recientes' }, indice);
    const antiguas = filtrarCitas(citas, { texto: '', estado: 'Todas', orden: 'antiguas' }, indice);
    expect(recientes[0]?.cita.fecha).toBe('2026-12-10');
    expect(antiguas[0]?.cita.fecha).toBe('2026-01-10');
    expect(citas).toEqual(copia);
  });

  it('resuelve médico y sede desde el índice', () => {
    const [fila] = filtrarCitas(citas.slice(1, 2), { texto: '', estado: 'Todas', orden: 'recientes' }, indice);
    expect(fila).toMatchObject({ medico: 'Franco Espinola', sede: 'Hospital Central' });
  });

  it('busca sin distinguir tildes', () => {
    const conTilde = [{ ...citas[0], id: 'x', paciente: 'Óscar Huamán' } as Cita];
    expect(filtrarCitas(conTilde, { texto: 'oscar huaman', estado: 'Todas', orden: 'recientes' }, indice)).toHaveLength(1);
  });
});

