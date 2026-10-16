import { valoracion } from './pipes/valoracion.pipe';
import { cargarAtomico, PATRON_DNI, validarCita } from './utilidades/validacion';
import { PERM_RECETAR, PERM_RESERVAR, ROLE_PACIENTE, tienePermiso } from './modelos/cita';
const cita = { id: '1', dniPaciente: '12345678', medicoId: 'm1', seguro: 'SIS', fecha: '2026-11-02', hora: '09:30', estado: 'Pendiente' };
describe('Curar', () => {
  it('valida DNI de 8 dígitos', () => { expect(PATRON_DNI.test('1234567')).toBe(false); expect(validarCita({ ...cita, dniPaciente: '123' }).ok).toBe(false); });
  it('la carga es atómica y rechaza ids duplicados', () => { expect(cargarAtomico([cita, { ...cita, hora: '99:00', id: '2' }]).ok).toBe(false); expect(cargarAtomico([cita, cita]).ok).toBe(false); expect(cargarAtomico([cita]).ok).toBe(true); });
  it('permisos por bits y valoración', () => { expect(tienePermiso(ROLE_PACIENTE, PERM_RESERVAR)).toBe(true); expect(tienePermiso(ROLE_PACIENTE, PERM_RECETAR)).toBe(false); expect(valoracion(4.6)).toBe('Excelente'); });
});
import { capitalizarNombre, PATRON_CLAVE, PATRON_TELEFONO } from './utilidades/validacion';
describe('Registro', () => {
  it('normaliza nombres y valida celular y clave', () => { expect(capitalizarNombre('  maría-josé   o\'connor ')).toBe("María-José O'Connor"); expect(PATRON_TELEFONO.test('912345678')).toBe(true); expect(PATRON_TELEFONO.test('812345678')).toBe(false); expect(PATRON_CLAVE.test('abc12345')).toBe(true); expect(PATRON_CLAVE.test('abcdefgh')).toBe(false); });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CitasStore } from './estado/citas-store';
describe('CitasStore', () => {
  it('bloquea envíos duplicados mientras hay una solicitud en curso', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const s = TestBed.inject(CitasStore), h = TestBed.inject(HttpTestingController);
    const b = { dniPaciente: '12345678', medicoId: 'm1', seguro: 'SIS' as const, fecha: '2026-11-02', hora: '09:30' };
    s.reservar(b, () => undefined); s.reservar(b, () => undefined);
    const r = h.match('http://127.0.0.1:3000/citas');
    expect(r.length).toBe(1);
    r[0]!.flush({ ...b, id: '9', estado: 'Pendiente' });
    expect(s.total()).toBe(1); expect(s.guardando()).toBe(false);
  });
});

import { Auth, CODIGO_DEMO } from './servicios/auth';
import { Flujo } from './servicios/flujo';
describe('Verificación de correo y flujo', () => {
  it('rechaza un código incorrecto y expone el código de demostración', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    let ok: boolean | undefined; TestBed.inject(Auth).verificar('000000').subscribe((v) => (ok = v));
    expect(ok).toBe(false); expect(CODIGO_DEMO).toBe('123456');
  });
  it('el flujo de reserva empieza vacío', () => { const f = TestBed.inject(Flujo); expect(f.seguro()).toBeNull(); expect(f.sede()).toBeNull(); });
});
describe('Registro (tipos)', () => {
  it('registrar() devuelve false si el DNI ya existe', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const h = TestBed.inject(HttpTestingController); let ok: boolean | undefined;
    TestBed.inject(Auth).registrar({ dni: '12345678', nombre: 'Ana', correo: 'a@b.pe', telefono: '912345678', password: 'abc12345', rol: 1 }).subscribe((v) => (ok = v));
    h.expectOne('http://127.0.0.1:3000/usuarios').flush([{ dni: '12345678', nombre: 'Ana', rol: 1, password: 'x' }]);
    expect(ok).toBe(false);
  });
});
