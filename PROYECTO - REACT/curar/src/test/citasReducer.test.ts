import { describe, expect, it } from 'vitest';
import { citasReducer, ESTADO_INICIAL, type EstadoCitas } from '../context/citasReducer';
import type { Cita, Favorito } from '../types/cita';

const cita = (id: string, estado: Cita['estado'] = 'Pendiente'): Cita => ({ id, dniPaciente: '12345678', medicoId: 'm1', seguro: 'SIS', fecha: '2026-11-20', hora: '09:30', estado });
const favorito = (id: string): Favorito => ({ id, dni: '12345678', medicoId: `m${id}` });

describe('citasReducer', () => {
  it('cuenta cargas simultáneas: solo deja de cargar cuando terminan todas', () => {
    let s = citasReducer(ESTADO_INICIAL, { type: 'cargaIniciada' });
    s = citasReducer(s, { type: 'cargaIniciada' });
    s = citasReducer(s, { type: 'cargado', coleccion: 'favoritos', datos: [favorito('f1')] });
    expect(s.cargas).toBe(1); // la segunda carga sigue en curso
    s = citasReducer(s, { type: 'cargaFallida', error: 'La API falló.' });
    expect(s.cargas).toBe(0);
    expect(s.error).toBe('La API falló.');
    expect(s.favoritos).toHaveLength(1);
  });

  it('actualiza una cita en la lista del paciente y en la del médico en una sola transición', () => {
    const antes: EstadoCitas = { ...ESTADO_INICIAL, citas: [cita('c1'), cita('c2')], citasMedico: [cita('c1')], guardando: true };
    const despues = citasReducer(antes, { type: 'citaActualizada', cita: cita('c1', 'Atendida') });
    expect(despues.citas.map((c) => c.estado)).toEqual(['Atendida', 'Pendiente']);
    expect(despues.citasMedico[0]?.estado).toBe('Atendida');
    expect(despues.guardando).toBe(false);
  });

  it('no muta el estado anterior (inmutabilidad)', () => {
    const antes: EstadoCitas = { ...ESTADO_INICIAL, favoritos: [favorito('f1'), favorito('f2')] };
    const copia = structuredClone(antes);
    const despues = citasReducer(antes, { type: 'favoritoQuitado', id: 'f1' });
    expect(antes).toEqual(copia);
    expect(despues).not.toBe(antes);
    expect(despues.favoritos.map((f) => f.id)).toEqual(['f2']);
  });

  it('un error de guardado libera "guardando" y conserva los datos', () => {
    const antes: EstadoCitas = { ...ESTADO_INICIAL, citas: [cita('c1')] };
    let s = citasReducer(antes, { type: 'guardadoIniciado' });
    expect(s.guardando).toBe(true);
    s = citasReducer(s, { type: 'guardadoFallido', error: 'No se pudo contactar la API.' });
    expect(s).toMatchObject({ guardando: false, error: 'No se pudo contactar la API.', citas: antes.citas });
  });
});
