import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CitasStore } from '../estado/citas-store';
import { PERM_RECETAR, PERM_RESERVAR, tienePermiso } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
import { CurarApi, type UsuarioApi } from '../servicios/curar-api';
import { capitalizarNombre, PATRON_CLAVE, PATRON_CORREO, PATRON_NOMBRE, PATRON_TELEFONO } from '../utilidades/validacion';
type Tab = 'resumen' | 'perfil';
@Component({
  selector: 'app-cuenta-paciente', imports: [ReactiveFormsModule, RouterLink, DatePipe], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap" style="padding:48px 20px"><h1>Mi cuenta</h1>
    <div role="tablist" aria-label="Secciones de mi cuenta" style="display:flex;gap:8px;margin:16px 0">
      @for (t of tabs; track t.id) { <button type="button" role="tab" class="btn" [class.ghost]="tab() !== t.id" [attr.aria-selected]="tab() === t.id" (click)="tab.set(t.id)">{{ t.n }}</button> }</div>
    <p class="err" role="alert">{{ error() }}</p>
    @if (tab() === 'resumen') {
      @if (u(); as x) { <div class="docs">
        <article class="tabla"><h2 style="font-size:20px">Ficha de identificación</h2>
          <p><b>DNI</b> {{ x.dni }}</p><p><b>Correo</b> {{ x.correo }}</p><p><b>Celular</b> {{ x.telefono }}</p><p><b>Cobertura</b> {{ x.seguro ?? 'No especificada' }}</p>
          <p><b>Miembro desde</b> {{ x.creadoEn | date: 'MMMM y' }}</p></article>
        <article class="tabla"><h2 style="font-size:20px">Próximas citas</h2>
          @for (c of proximas(); track c.id) { <p>{{ c.fecha }} · {{ c.hora }} — {{ c.seguro }} <span class="pill" [attr.data-estado]="c.estado">{{ c.estado }}</span></p> }
          @empty { <p>Aún no tienes citas. <a routerLink="/seguro" class="link">Reserva una</a>.</p> }</article>
        <article class="tabla"><h2 style="font-size:20px">Permisos</h2>
          @for (p of permisos(); track p.t) { <p>{{ p.a ? '✓' : '✕' }} {{ p.t }}</p> }</article></div> }
      @else { <p role="status">Cargando tu información…</p> }
    } @else {
      <div class="docs">
        <form class="tabla" [formGroup]="perfil" (ngSubmit)="guardarPerfil()" novalidate style="display:grid;gap:10px"><h2 style="font-size:20px">Editar datos personales</h2>
          <label>Nombre completo<input formControlName="nombre" [attr.aria-invalid]="malo(perfil, 'nombre')"></label>
          <label>Correo electrónico<input type="email" formControlName="correo" [attr.aria-invalid]="malo(perfil, 'correo')"></label>
          <label>Celular<input formControlName="telefono" inputmode="numeric" maxlength="9" [attr.aria-invalid]="malo(perfil, 'telefono')"></label>
          <label>Seguro<select formControlName="seguro"><option>SIS</option><option>EsSalud</option><option>Particular</option></select></label>
          <p class="err" role="alert">@if (intentoP() && perfil.invalid) { Revisa nombre (5+ letras), correo y celular de 9 dígitos que empiece con 9. } {{ errPerfil() }}</p>
          <button class="btn brand" type="submit" [disabled]="cargando()">Guardar cambios</button><p role="status" aria-live="polite">{{ okPerfil() }}</p></form>
        <form class="tabla" [formGroup]="clave" (ngSubmit)="guardarClave()" novalidate style="display:grid;gap:10px"><h2 style="font-size:20px">Cambiar contraseña</h2>
          <label>Contraseña actual<input type="password" formControlName="actual" autocomplete="current-password"></label>
          <label>Nueva contraseña<input type="password" formControlName="nueva" autocomplete="new-password" [attr.aria-invalid]="malo(clave, 'nueva')"></label>
          <label>Repite la nueva contraseña<input type="password" formControlName="confirmar" autocomplete="new-password"></label>
          <p class="err" role="alert">@if (intentoC() && clave.invalid) { Mínimo 8 caracteres con letras y números, y ambas deben coincidir. } {{ errClave() }}</p>
          <button class="btn brand" type="submit" [disabled]="cargando()">Actualizar contraseña</button><p role="status" aria-live="polite">{{ okClave() }}</p></form></div> }</section>`,
})
export class CuentaPaciente {
  private readonly api = inject(CurarApi); private readonly auth = inject(Auth); protected readonly store = inject(CitasStore);
  protected readonly tabs: { id: Tab; n: string }[] = [{ id: 'resumen', n: 'Resumen' }, { id: 'perfil', n: 'Mi perfil' }];
  protected readonly tab = signal<Tab>('resumen'); protected readonly u = signal<UsuarioApi | null>(null);
  protected readonly cargando = signal(false); protected readonly error = signal('');
  protected readonly okPerfil = signal(''); protected readonly okClave = signal(''); protected readonly errPerfil = signal(''); protected readonly errClave = signal('');
  protected readonly intentoP = signal(false); protected readonly intentoC = signal(false);
  protected readonly permisos = computed(() => { const r = this.auth.usuario()?.rol ?? 0; return [{ t: 'Reservar citas médicas', a: tienePermiso(r, PERM_RESERVAR) }, { t: 'Emitir recetas digitales', a: tienePermiso(r, PERM_RECETAR) }]; });
  protected readonly proximas = computed(() => [...this.store.citas()].filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada').sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).slice(0, 3));
  private readonly fb = inject(FormBuilder);
  protected readonly perfil = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.minLength(5), Validators.pattern(PATRON_NOMBRE)]], correo: ['', [Validators.required, Validators.pattern(PATRON_CORREO)]], telefono: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]], seguro: ['SIS'] });
  protected readonly clave = this.fb.nonNullable.group({ actual: ['', Validators.required], nueva: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]], confirmar: ['', Validators.required] },
    { validators: (g: AbstractControl) => (g.get('nueva')?.value === g.get('confirmar')?.value ? null : { noCoincide: true }) });
  constructor() {
    const s = this.auth.usuario(); if (!s) return;
    this.store.cargarCitas(s.dni);
    ejecutar(this.api.usuarios(s.dni), this.cargando, this.error, (l) => { const x = l[0]; if (!x) return; this.u.set(x); this.perfil.setValue({ nombre: x.nombre, correo: x.correo ?? '', telefono: x.telefono ?? '', seguro: x.seguro ?? 'SIS' }); });
  }
  protected malo(g: { controls: Record<string, AbstractControl> }, c: string): boolean { const x = g.controls[c]; return !!x && x.invalid && (x.touched || this.intentoP() || this.intentoC()); }
  protected guardarPerfil(): void {
    this.intentoP.set(true); this.okPerfil.set(''); this.errPerfil.set('');
    const x = this.u(); if (this.perfil.invalid || !x?.id || this.cargando()) { this.perfil.markAllAsTouched(); return; }
    const v = this.perfil.getRawValue(), nombre = capitalizarNombre(v.nombre), correo = v.correo.trim().toLowerCase();
    ejecutar(this.api.correoUsado(correo, String(x.dni)), this.cargando, this.error, (usado) => {
      if (usado) { this.errPerfil.set('Ese correo ya está registrado por otra cuenta.'); return; }
      ejecutar(this.api.actualizarUsuario(x.id!, { nombre, correo, telefono: v.telefono, seguro: v.seguro }), this.cargando, this.error, (n) => { this.u.set(n); this.auth.renombrar(n.nombre); this.okPerfil.set('Tus datos se actualizaron correctamente.'); });
    });
  }
  protected guardarClave(): void {
    this.intentoC.set(true); this.okClave.set(''); this.errClave.set('');
    const x = this.u(); if (this.clave.invalid || !x?.id || this.cargando()) { this.clave.markAllAsTouched(); return; }
    const v = this.clave.getRawValue();
    if (String(x.password) !== v.actual) { this.errClave.set('La contraseña actual no es correcta.'); return; }
    ejecutar(this.api.actualizarUsuario(x.id, { password: v.nueva }), this.cargando, this.error, (n) => { this.u.set(n); this.clave.reset(); this.intentoC.set(false); this.okClave.set('Contraseña actualizada.'); });
  }
}
