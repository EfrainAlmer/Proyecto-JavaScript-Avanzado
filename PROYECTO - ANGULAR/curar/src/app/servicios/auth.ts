import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { map, of, switchMap, type Observable } from 'rxjs';
import { HORARIO_BASE, ROLE_ADMIN, ROLE_MEDICO, tienePermiso, type Sesion } from '../modelos/cita';
import { CurarApi, type UsuarioApi } from './curar-api';
const CLAVE = 'curar_sesion_activa';
const PENDIENTE = 'curar_pendiente_verificacion';
/** Simulación: en un sistema real el código se genera y se envía por correo. */
export const CODIGO_DEMO = '123456';
export type ResultadoLogin = 'ok' | 'error' | 'pendiente';
export interface DatosRegistro { dni: string; nombre: string; correo: string; telefono: string; password: string; rol: number; cmp?: string; especialidad?: string }
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(CurarApi);
  private readonly actual = signal<Sesion | null>(this.leer());
  readonly usuario = this.actual.asReadonly();
  private leer(): Sesion | null { try { return JSON.parse(localStorage.getItem(CLAVE) ?? 'null') as Sesion | null; } catch { return null; } }
  private guardar(s: Sesion): void { localStorage.setItem(CLAVE, JSON.stringify(s)); this.actual.set(s); }
  private abrir(u: UsuarioApi): void { this.guardar({ dni: String(u.dni), nombre: u.nombre, rol: u.rol, ...(u.medicoId ? { medicoId: u.medicoId } : {}) }); }
  inicio(): string { const r = this.actual()?.rol ?? 0; return r & ROLE_ADMIN ? '/admin' : r & ROLE_MEDICO ? '/panel-medico' : '/panel'; }
  pendiente(): string | null { return sessionStorage.getItem(PENDIENTE); }
  renombrar(nombre: string): void { const s = this.actual(); if (s) this.guardar({ ...s, nombre }); }
  /** Demo académico: la verificación real de contraseñas debe hacerse en un backend con hash. */
  ingresar(dni: string, password: string): Observable<ResultadoLogin> {
    return this.api.usuarios(dni).pipe(map((l): ResultadoLogin => {
      const u = l[0]; if (!u || String(u.password) !== password) return 'error';
      if (u.verificado === false) { sessionStorage.setItem(PENDIENTE, String(u.dni)); return 'pendiente'; }
      this.abrir(u); return 'ok';
    }));
  }
  /** Crea la cuenta sin abrir sesión: primero hay que verificar el correo. Devuelve false si el DNI ya existe. */
  registrar(d: DatosRegistro): Observable<boolean> {
    return this.api.usuarios(d.dni).pipe(switchMap((l): Observable<boolean> => {
      if (l.length) return of(false);
      const medicoId = d.rol === ROLE_MEDICO && d.cmp ? `m${d.cmp}` : undefined; // del CMP solo se valida el formato
      const usuario: UsuarioApi = { dni: d.dni, nombre: d.nombre, correo: d.correo, telefono: d.telefono, password: d.password, rol: d.rol, verificado: false, creadoEn: new Date().toISOString(), ...(medicoId ? { medicoId, cmp: d.cmp } : {}) };
      // Tipo explícito: antes se mezclaban Observable<Medico> y Observable<null> y TypeScript no podía inferir pipe().
      const alta$: Observable<unknown> = medicoId
        ? this.api.altaMedico({ id: medicoId, nombre: d.nombre, especialidad: d.especialidad ?? 'Medicina General', calificacion: 0, centro: 'Por asignar', horario: [...HORARIO_BASE], cmp: d.cmp ?? '', estado: 'Activo' })
        : of(null);
      return alta$.pipe(
        switchMap(() => this.api.registrar(usuario)),
        map((u): boolean => { sessionStorage.setItem(PENDIENTE, String(u.dni)); return true; }),
      );
    }));
  }
  verificar(codigo: string): Observable<boolean> {
    const dni = this.pendiente();
    if (!dni || codigo !== CODIGO_DEMO) return of(false);
    return this.api.usuarios(dni).pipe(switchMap((l): Observable<boolean> => {
      const u = l[0]; if (!u?.id) return of(false);
      return this.api.actualizarUsuario(u.id, { verificado: true }).pipe(map((n): boolean => { sessionStorage.removeItem(PENDIENTE); this.abrir(n); return true; }));
    }));
  }
  salir(): void { localStorage.removeItem(CLAVE); this.actual.set(null); }
}
export const conPermiso = (permiso: number): CanActivateFn => () => {
  const u = inject(Auth).usuario();
  return u && tienePermiso(u.rol, permiso) ? true : inject(Router).parseUrl(u ? '/' : '/login');
};
