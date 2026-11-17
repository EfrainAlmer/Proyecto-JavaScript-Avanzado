import { describe, expect, it } from 'vitest';
import { PERM_RECETAR, PERM_RESERVAR, ROLE_PACIENTE, tienePermiso } from '../types/cita';
import { decimal1, fechaCorta, hora12, mesAnio } from '../utils/formato';
import { cargarAtomico, capitalizarNombre, PATRON_CLAVE, PATRON_DNI, PATRON_TELEFONO, validarCita } from '../utils/validacion';
import { valoracion } from '../utils/valoracion';

const cita = { id: '1', dniPaciente: '12345678', medicoId: 'm1', seguro: 'SIS', fecha: '2026-11-02', hora: '09:30', estado: 'Pendiente' };

describe('Curar', () => {
  it('valida DNI de 8 dígitos', () => {
    expect(PATRON_DNI.test('1234567')).toBe(false);
    expect(validarCita({ ...cita, dniPaciente: '123' }).ok).toBe(false);
  });
  it('la carga es atómica y rechaza ids duplicados', () => {
    expect(cargarAtomico([cita, { ...cita, hora: '99:00', id: '2' }]).ok).toBe(false);
    expect(cargarAtomico([cita, cita]).ok).toBe(false);
    expect(cargarAtomico([cita]).ok).toBe(true);
  });
  it('permisos por bits y valoración', () => {
    expect(tienePermiso(ROLE_PACIENTE, PERM_RESERVAR)).toBe(true);
    expect(tienePermiso(ROLE_PACIENTE, PERM_RECETAR)).toBe(false);
    expect(valoracion(4.6)).toBe('Excelente');
    expect(valoracion(0)).toBe('Nuevo');
  });
});

describe('Registro', () => {
  it('normaliza nombres y valida celular y clave', () => {
    expect(capitalizarNombre("  maría-josé   o'connor ")).toBe("María-José O'Connor");
    expect(PATRON_TELEFONO.test('912345678')).toBe(true);
    expect(PATRON_TELEFONO.test('812345678')).toBe(false);
    expect(PATRON_CLAVE.test('abc12345')).toBe(true);
    expect(PATRON_CLAVE.test('abcdefgh')).toBe(false);
  });
});

describe('Formato', () => {
  it('interpreta YYYY-MM-DD como fecha local (sin desfase de zona horaria)', () => {
    expect(fechaCorta('2026-11-17')).toMatch(/17/u);
    expect(mesAnio('2026-11-01')).toContain('2026');
  });
  it('convierte a reloj de 12 horas y a un decimal', () => {
    expect(hora12('15:30')).toBe('3:30 PM');
    expect(hora12('00:15')).toBe('12:15 AM');
    expect(decimal1(4.55)).toBe('4.5');
  });
});
