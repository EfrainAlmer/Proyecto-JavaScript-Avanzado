import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({ selector: 'app-no-encontrada', imports: [RouterLink], template: `<section class="wrap" style="padding:64px 20px"><h1>Página no encontrada</h1><p>La dirección no corresponde a una vista de Curar.</p><a routerLink="/" class="btn">Volver al inicio</a></section>` })
export class NoEncontrada {}
