import { useEffect, useRef, useState } from 'react';

/** ¿Se puede animar? Sin IntersectionObserver (pruebas) o con movimiento reducido, se muestra el valor final. */
const animable = (): boolean =>
  typeof window !== 'undefined' && 'IntersectionObserver' in window && typeof window.matchMedia === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface ContadorProps {
  readonly valor: number;
  readonly duracion?: number;
}

/**
 * Cifra que sube de 0 a `valor` la primera vez que entra en pantalla.
 * El lector de pantalla lee siempre el valor final (span oculto); el número animado es decorativo.
 */
export function Contador({ valor, duracion = 1200 }: ContadorProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mostrado, setMostrado] = useState(() => (animable() ? 0 : valor));

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || !animable()) return;
    let cuadro = 0;
    const observador = new IntersectionObserver(([entrada]) => {
      if (!entrada?.isIntersecting) return;
      observador.disconnect(); // solo una vez
      const inicio = performance.now();
      const paso = (ahora: number): void => {
        const p = Math.min(1, (ahora - inicio) / duracion);
        setMostrado(Math.round(valor * (1 - (1 - p) ** 3))); // desaceleración suave al final
        if (p < 1) cuadro = requestAnimationFrame(paso);
      };
      cuadro = requestAnimationFrame(paso);
    }, { threshold: 0.6 });
    observador.observe(nodo);
    return () => {
      observador.disconnect();
      cancelAnimationFrame(cuadro);
    };
  }, [valor, duracion]);

  return (
    <>
      <span ref={ref} aria-hidden="true">{mostrado}</span>
      <span className="visually-hidden">{valor}</span>
    </>
  );
}
