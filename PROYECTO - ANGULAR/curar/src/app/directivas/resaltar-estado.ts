import { computed, Directive, input } from '@angular/core';
@Directive({ selector: '[appResaltarEstado]', host: { '[class]': 'clase()', '[attr.data-estado]': 'estado()' } })
export class ResaltarEstado {
  readonly estado = input.required<string>({ alias: 'appResaltarEstado' });
  protected readonly clase = computed(() => `tabla estado-${this.estado().toLowerCase()}`);
}
