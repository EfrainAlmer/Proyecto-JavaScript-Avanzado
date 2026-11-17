import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi } from '../servicios/curar-api';
import { capitalizarNombre, PATRON_DNI, PATRON_NOMBRE } from '../utilidades/validacion';
/** El DNI es opcional (p. ej. menores sin documento), pero si se escribe debe tener 8 dígitos. */
const dniOpcional = (c: AbstractControl): ValidationErrors | null => { const v = String(c.value ?? '').trim(); return v === '' || PATRON_DNI.test(v) ? null : { dni: true }; };
@Component({
  selector: 'app-familiares', imports: [ReactiveFormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Mis familiares</h1>
    <p style="margin:6px 0 16px">Registra a tus familiares para reservar citas a su nombre. Para cambiar tus datos ve a <a routerLink="/cuenta" class="link">Mi cuenta</a>.</p>
    <p class="err" role="alert">{{ store.error() }}</p>
    @for (f of store.familiares(); track f.id) {
      <article class="tabla"><b>{{ f.nombre }}</b> <span class="pill">{{ f.parentesco }}</span><br><small>DNI {{ f.dni || 'sin DNI' }} · {{ f.seguro }}</small><br>
        <a class="btn ghost" style="margin:8px 8px 0 0" routerLink="/seguro">Reservar cita</a>
        @if (borrando() === f.id) { <button class="btn" type="button" [disabled]="store.guardando()" (click)="quitar(f.id ?? '')">Confirmar</button> <button class="btn ghost" type="button" (click)="borrando.set('')">No</button> }
        @else { <button class="btn ghost" style="margin-top:8px" type="button" (click)="borrando.set(f.id ?? '')">Quitar</button> }</article>
    } @empty { <p class="tabla" role="status">{{ store.cargando() ? 'Cargando…' : 'Aún no registraste familiares.' }}</p> }
    <form class="tabla" [formGroup]="form" (ngSubmit)="agregar()" novalidate style="display:grid;gap:10px;max-width:560px"><h2 style="font-size:20px">Agregar familiar</h2>
      <label>Nombre completo<input formControlName="nombre" [attr.aria-invalid]="malo('nombre')"></label>
      <label>Parentesco<select formControlName="parentesco"><option>Hijo/a</option><option>Cónyuge</option><option>Padre</option><option>Madre</option><option>Hermano/a</option><option>Otro</option></select></label>
      <label>DNI (opcional)<input formControlName="dni" inputmode="numeric" maxlength="8" [attr.aria-invalid]="malo('dni')"></label>
      <label>Seguro<select formControlName="seguro"><option>SIS</option><option>EsSalud</option><option>Particular</option></select></label>
      <p class="err" role="alert">@if (intento() && form.invalid) { Escribe un nombre válido (3+ letras) y, si pones DNI, que tenga 8 dígitos. } {{ errDup() }}</p>
      <button class="btn brand" type="submit" [disabled]="store.guardando()">Guardar familiar</button><p role="status" aria-live="polite">{{ aviso() }}</p></form></section>`,
})
export class Familiares {
  protected readonly store = inject(CitasStore); private readonly auth = inject(Auth); private readonly api = inject(CurarApi);
  protected readonly intento = signal(false); protected readonly aviso = signal(''); protected readonly errDup = signal(''); protected readonly borrando = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({ nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), Validators.pattern(PATRON_NOMBRE)]], parentesco: ['Hijo/a'], dni: ['', [dniOpcional]], seguro: ['SIS'] });
  constructor() { const u = this.auth.usuario(); if (u) this.store.cargarFamiliares(u.dni); }
  protected malo(c: 'nombre' | 'dni'): boolean { const x = this.form.controls[c]; return x.invalid && (x.touched || this.intento()); }
  protected agregar(): void {
    this.intento.set(true); this.aviso.set(''); this.errDup.set('');
    const u = this.auth.usuario(); if (!u || this.form.invalid || this.store.guardando()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue(), dni = v.dni.trim();
    if (dni && (dni === u.dni || this.store.familiares().some((f) => f.dni === dni))) { this.errDup.set('Ese DNI ya está registrado en tu cuenta.'); return; }
    ejecutar(this.api.agregarFamiliar({ dniTitular: u.dni, nombre: capitalizarNombre(v.nombre), parentesco: v.parentesco, dni, seguro: v.seguro }), this.store.guardando, this.store.error,
      (f) => { this.store.familiares.update((l) => [...l, f]); this.form.reset(); this.intento.set(false); this.aviso.set('Familiar agregado.'); });
  }
  protected quitar(id: string): void { if (!id) return; ejecutar(this.api.quitarFamiliar(id), this.store.guardando, this.store.error, () => { this.store.familiares.update((l) => l.filter((f) => f.id !== id)); this.borrando.set(''); }); }
}
