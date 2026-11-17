import type { ReactNode } from 'react';
import type { EstadoCita } from '../types/cita';

interface ArticuloEstadoProps {
  readonly estado: EstadoCita;
  readonly children: ReactNode;
}

/** Sustituye la directiva `appResaltarEstado`: aplica clase y data-estado según el estado de la cita. */
export function ArticuloEstado({ estado, children }: ArticuloEstadoProps) {
  return (
    <article className={`tabla estado-${estado.toLowerCase()}`} data-estado={estado}>
      {children}
    </article>
  );
}
