import type { Medico } from '../types/cita';
import { decimal1 } from '../utils/formato';
import { valoracion } from '../utils/valoracion';

interface TarjetaMedicoProps {
  readonly medico: Medico;
  readonly onReservar: (medicoId: string) => void;
  readonly onPerfil: (medicoId: string) => void;
}

export function TarjetaMedico({ medico, onReservar, onPerfil }: TarjetaMedicoProps) {
  return (
    <article className="doccard">
      <div className="ph">
        {medico.foto ? <img src={medico.foto} alt="" width={800} height={600} loading="lazy" /> : <div className="avatar" />}
      </div>
      <div className="t">
        <h3>{medico.nombre}</h3>
        <small>{medico.especialidad} · {medico.centro}</small>
        <div className="stars" aria-label={`Calificación ${medico.calificacion} de 5`}>
          ★ {decimal1(medico.calificacion)} · {valoracion(medico.calificacion)}
        </div>
        <div className="acciones">
          <button className="btn ghost" type="button" aria-label={`Ver perfil de ${medico.nombre}`} onClick={() => onPerfil(medico.id)}>Ver perfil</button>
          <button className="btn" type="button" aria-label={`Reservar con ${medico.nombre}`} onClick={() => onReservar(medico.id)}>Reservar</button>
        </div>
      </div>
    </article>
  );
}
