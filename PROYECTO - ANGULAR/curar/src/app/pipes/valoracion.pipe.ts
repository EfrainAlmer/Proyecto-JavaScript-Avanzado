import { Pipe, PipeTransform } from '@angular/core';
export const valoracion = (n: number): string => (n === 0 ? 'Nuevo' : n >= 4.5 ? 'Excelente' : n >= 4 ? 'Muy buena' : 'Buena');
@Pipe({ name: 'valoracion' })
export class ValoracionPipe implements PipeTransform { transform(n: number): string { return valoracion(n); } }
