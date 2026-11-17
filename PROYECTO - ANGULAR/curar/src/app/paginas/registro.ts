import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ROLE_MEDICO, ROLE_PACIENTE } from '../modelos/cita';
import { Auth } from '../servicios/auth';
import { mensajeHttp } from '../servicios/mensaje-http';
import { capitalizarNombre, PATRON_CLAVE, PATRON_CMP, PATRON_CORREO, PATRON_DNI, PATRON_NOMBRE, PATRON_TELEFONO } from '../utilidades/validacion';
const coinciden = (g: AbstractControl) => (g.get('password')?.value === g.get('confirmar')?.value ? null : { noCoincide: true });
type Campo = 'correo' | 'dni' | 'nombre' | 'telefono' | 'password' | 'confirmar';
@Component({
  selector: 'app-registro', imports: [ReactiveFormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap"><div class="authcard"><a class="close" routerLink="/" aria-label="Cerrar">✕</a><div class="dlg"><div class="form">
    <div class="logo"><span class="cross" aria-hidden="true"><svg viewBox="0 0 14 14"><path d="M5 0h4v5h5v4H9v5H5V9H0V5h5z" fill="var(--bg)"/></svg></span>Curar</div>
    <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
      @if (paso() === 1) {
        <h1 style="font-size:28px;font-weight:400">Crea una cuenta.</h1>
        <p style="color:var(--slate-text);margin-bottom:14px">Vamos a ponerte en marcha.</p>
        <div role="group" aria-label="Tipo de cuenta" style="display:flex;gap:8px;margin-bottom:12px"><button type="button" class="btn" [class.ghost]="rol() !== 1" [attr.aria-pressed]="rol() === 1" (click)="rol.set(1)">Soy paciente</button><button type="button" class="btn" [class.ghost]="rol() !== 2" [attr.aria-pressed]="rol() === 2" (click)="rol.set(2)">Soy médico</button></div>
        <label>Correo electrónico<input type="email" formControlName="correo" placeholder="nombre@gmail.com" autocomplete="email" [attr.aria-invalid]="malo('correo')"></label>
        <p class="err" role="alert">@if (malo('correo')) { Escribe un correo válido, por ejemplo nombre&#64;gmail.com. }</p>
        <button class="btn" type="submit" [disabled]="form.controls.correo.invalid" style="width:100%;justify-content:center">Siguiente</button>
      } @else {
        <h1 style="font-size:24px;font-weight:400">Completa tus datos</h1>
        <label>DNI<input formControlName="dni" inputmode="numeric" maxlength="8" [attr.aria-invalid]="malo('dni')"></label>
        <p class="err" role="alert">@if (malo('dni')) { El DNI debe tener exactamente 8 dígitos. }</p>
        <label>Nombres y apellidos<input formControlName="nombre" autocomplete="name" [attr.aria-invalid]="malo('nombre')"></label>
        <p class="err" role="alert">@if (malo('nombre')) { Usa solo letras, espacios, guiones o apóstrofos. }</p>
        <label>Celular<input formControlName="telefono" inputmode="numeric" maxlength="9" placeholder="9XXXXXXXX" [attr.aria-invalid]="malo('telefono')"></label>
        <p class="err" role="alert">@if (malo('telefono')) { El celular debe tener 9 dígitos y empezar con 9. }</p>
        @if (rol() === 2) { <label>Código CMP (colegiatura)<input formControlName="cmp" inputmode="numeric" maxlength="6" [attr.aria-invalid]="errCmp()"></label>
        <p class="err" role="alert">@if (errCmp()) { El código CMP debe tener 5 o 6 dígitos. }</p>
        <label>Especialidad<select formControlName="especialidad"><option>Medicina General</option><option>Pediatría</option><option>Cardiología</option><option>Ginecología</option></select></label> }
        <label>Contraseña<input type="password" formControlName="password" autocomplete="new-password" [attr.aria-invalid]="malo('password')"></label>
        <p class="err" role="alert">@if (malo('password')) { Mínimo 8 caracteres, con al menos una letra y un número. }</p>
        <label>Repite la contraseña<input type="password" formControlName="confirmar" autocomplete="new-password"></label>
        <p class="err" role="alert">@if (intento() && form.hasError('noCoincide')) { Las contraseñas no coinciden. }</p>
        <button class="btn brand" type="submit" [disabled]="enviando()" style="width:100%;justify-content:center">{{ enviando() ? 'Creando…' : 'Crear cuenta' }}</button>
        <button class="link" type="button" (click)="paso.set(1)">← Cambiar correo</button>
        <p class="err" role="alert">{{ error() }}</p>
      }
      <p style="margin-top:14px;font-size:14px">¿Ya tienes cuenta? <a routerLink="/login" class="link">Inicia sesión</a></p>
    </form></div><div class="vis" aria-hidden="true">+ Curar</div></div></div></section>`,
})
export class Registro {
  private readonly auth = inject(Auth); private readonly router = inject(Router);
  protected readonly rol = signal<number>(ROLE_PACIENTE); protected readonly errCmp = signal(false); protected readonly paso = signal<1 | 2>(1); protected readonly intento = signal(false);
  protected readonly enviando = signal(false); protected readonly error = signal('');
  protected readonly form = inject(FormBuilder).nonNullable.group({
    correo: ['', [Validators.required, Validators.pattern(PATRON_CORREO)]],
    dni: ['', [Validators.required, Validators.pattern(PATRON_DNI)]],
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), Validators.pattern(PATRON_NOMBRE)]],
    telefono: ['', [Validators.required, Validators.pattern(PATRON_TELEFONO)]],
    password: ['', [Validators.required, Validators.pattern(PATRON_CLAVE)]],
    confirmar: ['', Validators.required], cmp: [''], especialidad: ['Medicina General'],
  }, { validators: coinciden });
  protected malo(c: Campo): boolean { const x = this.form.controls[c]; return x.invalid && (x.touched || this.intento()); }
  protected enviar(): void {
    if (this.paso() === 1) { if (this.form.controls.correo.valid) this.paso.set(2); else this.form.controls.correo.markAsTouched(); return; }
    this.intento.set(true); this.error.set('');
    const v = this.form.getRawValue();
    this.errCmp.set(this.rol() === ROLE_MEDICO && !PATRON_CMP.test(v.cmp));
    if (this.form.invalid || this.errCmp() || this.enviando()) { this.form.markAllAsTouched(); return; }
    this.enviando.set(true);
    this.auth.registrar({ dni: v.dni, nombre: capitalizarNombre(v.nombre), correo: v.correo.trim().toLowerCase(), telefono: v.telefono, password: v.password, rol: this.rol(), cmp: v.cmp, especialidad: v.especialidad }).subscribe({
      next: (ok) => { this.enviando.set(false); if (ok) void this.router.navigate(['/verificar']); else this.error.set('Ya existe una cuenta con ese DNI.'); },
      error: (e) => { this.enviando.set(false); this.error.set(mensajeHttp(e)); } });
  }
}
