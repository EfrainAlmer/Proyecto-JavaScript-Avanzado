import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth, CODIGO_DEMO } from '../servicios/auth';
import { ejecutar } from '../servicios/carga';
@Component({
  selector: 'app-verificar', imports: [ReactiveFormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="wrap"><div class="authcard"><a class="close" routerLink="/" aria-label="Cerrar">✕</a><div class="dlg"><div class="form">
    <div class="logo"><span class="cross" aria-hidden="true"><svg viewBox="0 0 14 14"><path d="M5 0h4v5h5v4H9v5H5V9H0V5h5z" fill="var(--bg)"/></svg></span>Curar</div>
    <form [formGroup]="form" (ngSubmit)="confirmar()" novalidate>
      <h1 style="font-size:24px;font-weight:400">Verifica tu correo</h1>
      <p style="color:var(--slate-text);margin-bottom:14px">Escribe el código de 6 dígitos. <b>Modo demostración:</b> el código es {{ demo }}.</p>
      <label>Código de verificación<input formControlName="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" [attr.aria-invalid]="intento() && form.invalid"></label>
      <p class="err" role="alert">{{ error() }}</p>
      <button class="btn brand" type="submit" [disabled]="cargando()" style="width:100%;justify-content:center">{{ cargando() ? 'Verificando…' : 'Verificar' }}</button>
      <button class="link" type="button" (click)="aviso.set('Código reenviado (simulado).')">Reenviar código</button>
      <p role="status" aria-live="polite">{{ aviso() }}</p>
    </form></div><div class="vis" aria-hidden="true">+ Curar</div></div></div></section>`,
})
export class Verificar {
  private readonly auth = inject(Auth); private readonly router = inject(Router);
  protected readonly demo = CODIGO_DEMO;
  protected readonly cargando = signal(false); protected readonly error = signal(''); protected readonly aviso = signal(''); protected readonly intento = signal(false);
  protected readonly form = inject(FormBuilder).nonNullable.group({ codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/u)]] });
  constructor() { if (!this.auth.pendiente()) void this.router.navigate(['/login'], { replaceUrl: true }); }
  protected confirmar(): void {
    this.intento.set(true); this.error.set('');
    if (this.form.invalid) { this.error.set('El código tiene 6 dígitos.'); return; }
    ejecutar(this.auth.verificar(this.form.getRawValue().codigo), this.cargando, this.error, (ok) => { if (ok) void this.router.navigate([this.auth.inicio()]); else this.error.set('Código incorrecto.'); });
  }
}
