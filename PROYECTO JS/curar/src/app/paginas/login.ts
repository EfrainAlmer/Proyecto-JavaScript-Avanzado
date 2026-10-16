import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../servicios/auth';
import { mensajeHttp } from '../servicios/mensaje-http';
import { PATRON_DNI } from '../utilidades/validacion';
@Component({
  selector: 'app-login', imports: [ReactiveFormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap"><div class="authcard"><a class="close" routerLink="/" aria-label="Cerrar">✕</a><div class="dlg"><div class="form">
    <div class="logo"><span class="cross" aria-hidden="true"><svg viewBox="0 0 14 14"><path d="M5 0h4v5h5v4H9v5H5V9H0V5h5z" fill="var(--bg)"/></svg></span>Curar</div>
    <form [formGroup]="form" (ngSubmit)="entrar()" novalidate>
      <h1 style="font-size:24px">Iniciar sesión</h1>
      <label>DNI<input formControlName="dni" inputmode="numeric" maxlength="8" autocomplete="username" [attr.aria-invalid]="malo('dni')"></label>
      <p class="err" role="alert">@if (malo('dni')) { El DNI debe tener exactamente 8 dígitos. }</p>
      <label>Contraseña<input formControlName="password" type="password" autocomplete="current-password" [attr.aria-invalid]="malo('password')"></label>
      <p class="err" role="alert">@if (malo('password')) { Escribe tu contraseña. }</p>
      <button class="btn brand" type="submit" [disabled]="enviando()" style="width:100%;justify-content:center">{{ enviando() ? 'Ingresando…' : 'Ingresar' }}</button>
      <p class="err" role="alert">{{ error() }}</p>
      <p style="margin-top:14px;font-size:14px">¿No tienes cuenta? <a routerLink="/registro" class="link">Regístrate</a></p>
    </form></div><div class="vis" aria-hidden="true">+ Curar</div></div></div></section>`,
})
export class Login {
  private readonly auth = inject(Auth); private readonly router = inject(Router);
  protected readonly enviando = signal(false); protected readonly error = signal(''); private readonly intento = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({ dni: ['', [Validators.required, Validators.pattern(PATRON_DNI)]], password: ['', Validators.required] });
  protected malo(c: 'dni' | 'password'): boolean { const x = this.form.controls[c]; return x.invalid && (x.touched || this.intento()); }
  protected entrar(): void {
    this.intento.set(true); this.error.set('');
    if (this.form.invalid || this.enviando()) { this.form.markAllAsTouched(); return; }
    const { dni, password } = this.form.getRawValue();
    this.enviando.set(true);
    this.auth.ingresar(dni, password).subscribe({
      next: (r) => { this.enviando.set(false); if (r === 'ok') void this.router.navigate([this.auth.inicio()]); else if (r === 'pendiente') void this.router.navigate(['/verificar']); else this.error.set('DNI o contraseña incorrectos.'); },
      error: (e) => { this.enviando.set(false); this.error.set(mensajeHttp(e)); } });
  }
}
