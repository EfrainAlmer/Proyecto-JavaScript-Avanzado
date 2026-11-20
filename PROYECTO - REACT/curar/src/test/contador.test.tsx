import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Contador } from '../components/Contador';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Contador', () => {
  it('sin IntersectionObserver (o con movimiento reducido) muestra directamente el valor final', () => {
    render(<Contador valor={94} />);
    expect(screen.getAllByText('94')).toHaveLength(2); // número visible + texto para lector de pantalla
  });

  it('sube de 0 al valor al entrar en pantalla y el lector siempre lee el final', () => {
    let alEntrar: IntersectionObserverCallback = () => undefined;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: IntersectionObserverCallback) { alEntrar = cb; }
      observe(): void {}
      disconnect(): void {}
    });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    let ahora = 0;
    const cuadros: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => cuadros.push(cb));
    vi.spyOn(performance, 'now').mockImplementation(() => ahora);

    const { container } = render(<Contador valor={94} duracion={1000} />);
    const visible = (): string => container.querySelector('[aria-hidden="true"]')?.textContent ?? '';
    expect(visible()).toBe('0');
    expect(screen.getByText('94')).toHaveClass('visually-hidden');

    act(() => alEntrar([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    act(() => { ahora = 500; cuadros.shift()?.(ahora); });
    expect(Number(visible())).toBeGreaterThan(0);
    expect(Number(visible())).toBeLessThan(94);
    act(() => { ahora = 1000; cuadros.shift()?.(ahora); });
    expect(visible()).toBe('94');
  });
});
