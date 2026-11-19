import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Cruz } from './Logo';

interface AuthShellProps {
  readonly children: ReactNode;
}

/** Contenedor común de login, registro y verificación. */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <section className="wrap">
      <div className="authcard">
        <Link className="close" to="/" aria-label="Cerrar">✕</Link>
        <div className="dlg">
          <div className="form">
            <div className="logo"><Cruz />Curar</div>
            {children}
          </div>
          {/* Antes era un bloque decorativo vacío ("+ Curar"); ahora resume qué obtiene quien entra. */}
          <aside className="vis" aria-label="Qué puedes hacer en Curar">
            <h2>Tu salud, sin colas</h2>
            <ul>
              <li><i className="bi bi-calendar2-check" aria-hidden="true" /> Reserva tu cita en 4 pasos</li>
              <li><i className="bi bi-file-earmark-medical" aria-hidden="true" /> Consulta tus recetas e historial</li>
              <li><i className="bi bi-people" aria-hidden="true" /> Gestiona las citas de tu familia</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
