import { describe, expect, it } from 'vitest';
import { ADMIN_INICIAL, adminReducer } from '../components/admin/adminReducer';
import type { Medico } from '../types/cita';

const medico = { id: 'm1' } as Medico;

describe('adminReducer (estado de interfaz)', () => {
  it('cambiar de pestaña cierra formulario, baja pendiente y aviso', () => {
    const sucio = { ...ADMIN_INICIAL, edicion: medico, baja: 'm2', aviso: 'x' };
    expect(adminReducer(sucio, { type: 'pestanaElegida', pestana: 'citas' })).toEqual({ ...ADMIN_INICIAL, pestana: 'citas' });
  });

  it('alta vuelve a la pestaña de médicos con formulario nuevo', () => {
    const r = adminReducer({ ...ADMIN_INICIAL, pestana: 'reclamos' }, { type: 'altaAbierta' });
    expect(r.pestana).toBe('medicos');
    expect(r.edicion).toBe('nuevo');
  });

  it('pedir la baja del médico en edición cierra su formulario; la de otro no', () => {
    const editando = { ...ADMIN_INICIAL, edicion: medico };
    expect(adminReducer(editando, { type: 'bajaPedida', id: 'm1' }).edicion).toBeNull();
    expect(adminReducer(editando, { type: 'bajaPedida', id: 'm9' }).edicion).toBe(medico);
  });

  it('guardar y dar de baja dejan aviso y limpian la acción pendiente', () => {
    expect(adminReducer({ ...ADMIN_INICIAL, edicion: 'nuevo' }, { type: 'medicoGuardado' })).toMatchObject({ edicion: null, aviso: 'Médico guardado.' });
    expect(adminReducer({ ...ADMIN_INICIAL, baja: 'm1' }, { type: 'bajaHecha' })).toMatchObject({ baja: '', aviso: 'Médico dado de baja.' });
  });

  it('no muta el estado anterior', () => {
    const antes = Object.freeze({ ...ADMIN_INICIAL });
    const despues = adminReducer(antes, { type: 'anulacionIniciada', id: 'c1' });
    expect(despues).not.toBe(antes);
    expect(antes.anulando).toBe('');
    expect(adminReducer(despues, { type: 'anulacionTerminada' }).anulando).toBe('');
  });
});
