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
          <div className="vis" aria-hidden="true">+ Curar</div>
        </div>
      </div>
    </section>
  );
}
