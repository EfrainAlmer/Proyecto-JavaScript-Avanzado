import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { ESTUDIANTES_INICIALES } from './datos/estudiantes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('crea la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('muestra el título y los seis estudiantes iniciales', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const vista = fixture.nativeElement as HTMLElement;
    expect(vista.querySelector('h1')?.textContent).toContain('Panel de seguimiento académico');
    expect(vista.querySelectorAll('.tarjeta-estudiante')).toHaveLength(6);
  });

  it('filtra los estudiantes en riesgo mediante un evento', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const vista = fixture.nativeElement as HTMLElement;
    const boton = [...vista.querySelectorAll('button')].find(
      (elemento) => elemento.textContent?.trim() === 'En riesgo',
    );
    boton?.click();
    await fixture.whenStable();
    expect(vista.querySelectorAll('.tarjeta-estudiante')).toHaveLength(2);
  });

  it('presenta el estado vacío y permite restaurar los datos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const vista = fixture.nativeElement as HTMLElement;
    const buscarBoton = (texto: string) =>
      [...vista.querySelectorAll('button')].find(
        (elemento) => elemento.textContent?.trim() === texto,
      );

    buscarBoton('Simular lista vacía')?.click();
    await fixture.whenStable();
    expect(vista.textContent).toContain('No hay estudiantes que coincidan');

    buscarBoton('Restaurar datos')?.click();
    await fixture.whenStable();
    expect(vista.querySelectorAll('.tarjeta-estudiante')).toHaveLength(6);
  });

  // ---------- RETO: pruebas de las dos mejoras ----------

  it('RETO 1: el filtro Destacados muestra promedio >= 14 y conserva aria-pressed', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const vista = fixture.nativeElement as HTMLElement;
    const boton = [...vista.querySelectorAll('button')].find(
      (elemento) => elemento.textContent?.trim() === 'Destacados',
    );
    expect(boton?.getAttribute('aria-pressed')).toBe('false');

    boton?.click();
    await fixture.whenStable();

    const nombres = [...vista.querySelectorAll('.tarjeta-estudiante h3')].map((h) =>
      h.textContent?.trim(),
    );
    expect(nombres).toEqual(['Ana Torres', 'Sofía Medina']);
    expect(boton?.getAttribute('aria-pressed')).toBe('true');
    expect(vista.querySelectorAll('[data-estado="destacado"]')).toHaveLength(2);
  });

  it('RETO 2: ordenar por promedio usa una copia y no muta los datos iniciales', async () => {
    const ordenOriginal = ESTUDIANTES_INICIALES.map((e) => e.id);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const vista = fixture.nativeElement as HTMLElement;
    const boton = [...vista.querySelectorAll('button')].find(
      (elemento) => elemento.textContent?.trim() === 'Ordenar por promedio',
    );
    const primerNombre = () => vista.querySelector('.tarjeta-estudiante h3')?.textContent?.trim();

    expect(primerNombre()).toBe('Ana Torres');

    boton?.click();
    await fixture.whenStable();
    const promedios = [...vista.querySelectorAll('.tarjeta-estudiante dd.fw-semibold')]
      .filter((_, indice) => indice % 2 === 0)
      .map((dd) => parseFloat(dd.textContent ?? '0'));
    expect(primerNombre()).toBe('Sofía Medina');
    expect(promedios).toEqual([...promedios].sort((a, b) => b - a));
    expect(boton?.getAttribute('aria-pressed')).toBe('true');

    boton?.click();
    await fixture.whenStable();
    expect(primerNombre()).toBe('Ana Torres');
    expect(ESTUDIANTES_INICIALES.map((e) => e.id)).toEqual(ordenOriginal);
  });
});
