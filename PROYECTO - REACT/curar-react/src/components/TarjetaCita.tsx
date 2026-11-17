import type { ReactNode } from 'react';
import type { Cita } from '../types/cita';
import { fechaCorta } from '../utils/formato';
import './TarjetaCita.css';

interface TarjetaCitaProps {
  readonly cita: Cita;
  readonly titulo: string;
  readonly subtitulo?: string;
  /** Acciones proyectadas (equivale a <ng-content />). */
  readonly children?: ReactNode;
}

export function TarjetaCita({ cita, titulo, subtitulo = '', children }: TarjetaCitaProps) {
  return (
    <div className="tarjeta-cita">
      <article className="cita" data-estado={cita.estado}>
        <div className="cuando">
          <strong>{cita.hora}</strong>
          <span>{fechaCorta(cita.fecha)}</span>
        </div>
        <div className="info">
          <h3>{titulo}</h3>
          {subtitulo && <p className="sub">{subtitulo}</p>}
          {cita.motivo && <p className="motivo">Motivo: {cita.motivo}</p>}
        </div>
        <div className="lado">
          <span className="pill" data-estado={cita.estado}>{cita.estado}</span>
          <div className="acciones">{children}</div>
        </div>
      </article>
    </div>
  );
}
