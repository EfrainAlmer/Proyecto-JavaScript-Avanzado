import { useEffect, useRef } from 'react';
import { Link, matchPath, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { ROLE_ADMIN, ROLE_MEDICO } from '../types/cita';
import { Cruz } from './Logo';

type RolVista = 'anonimo' | 'paciente' | 'medico' | 'admin';

/** Título de cada ruta. matchPath entiende parámetros como :id. */
const TITULOS: readonly (readonly [string, string])[] = [
  ['/', 'Curar · Reserva de citas médicas'],
  ['/login', 'Iniciar sesión'],
  ['/registro', 'Crear cuenta'],
  ['/verificar', 'Verificar correo'],
  ['/seguro', 'Elige tu seguro'],
  ['/sede', 'Elige tu sede'],
  ['/medicos', 'Buscar médicos'],
  ['/medicos/:id', 'Perfil del médico'],
  ['/centros', 'Centros de salud'],
  ['/reclamaciones', 'Libro de Reclamaciones'],
  ['/panel', 'Mi panel'],
  ['/citas', 'Mis citas'],
  ['/reservar', 'Reservar cita'],
  ['/recetas', 'Mis recetas'],
  ['/historial', 'Historial médico'],
  ['/familiares', 'Mis familiares'],
  ['/mensajes', 'Mensajes'],
  ['/cuenta', 'Mi cuenta'],
  ['/panel-medico', 'Panel médico'],
  ['/gestion-citas', 'Gestión de citas'],
  ['/consulta/:id', 'Atención médica'],
  ['/agenda', 'Mi agenda'],
  ['/admin', 'Administración'],
];

const tituloDe = (pathname: string): string =>
  TITULOS.find(([patron]) => matchPath(patron, pathname))?.[1] ?? 'Página no encontrada';

export function Layout() {
  const { usuario, salir } = useAuth();
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Al cambiar de ruta: actualiza el título y lleva el foco al contenido (accesibilidad).
  useEffect(() => {
    document.title = tituloDe(pathname);
    mainRef.current?.focus();
  }, [pathname]);

  // Derivado del rol de la sesión.
  const r = usuario?.rol ?? 0;
  const rol: RolVista = !r ? 'anonimo' : r & ROLE_ADMIN ? 'admin' : r & ROLE_MEDICO ? 'medico' : 'paciente';

  return (
    <>
      <a className="skip" href="#main">Saltar al contenido</a>
      <div className="topbar">
        <div className="topbar-in">
          <p><b>Emergencias:</b> <a href="tel:106">106 (SAMU)</a></p>
          <p>Central telefónica: <a href="tel:+5116120000">(01) 612-0000</a></p>
          <p className="hide-sm">WhatsApp: <a href="https://wa.me/51999000111">999 000 111</a></p>
          <p className="hide-sm">Lunes a sábado, las 24 horas del día.</p>
          <Link className="reclamos" to="/reclamaciones">Libro de Reclamaciones</Link>
        </div>
      </div>
      <header className="top">
        <div className="bar">
          <Link className="logo" to="/" aria-label="Curar, inicio"><Cruz />Curar</Link>
          <nav aria-label="Principal">
            {rol === 'anonimo' && (<><NavLink to="/" end>Inicio</NavLink><NavLink to="/seguro">Buscar médico</NavLink><NavLink to="/centros">Centros</NavLink></>)}
            {rol === 'paciente' && (
              <>
                <NavLink to="/panel">Mi panel</NavLink><NavLink to="/citas">Mis citas</NavLink><NavLink to="/recetas">Recetas</NavLink>
                <NavLink to="/mensajes">Mensajes</NavLink><NavLink to="/centros">Centros</NavLink><NavLink to="/cuenta">Mi cuenta</NavLink>
              </>
            )}
            {rol === 'medico' && (<><NavLink to="/panel-medico">Mi panel</NavLink><NavLink to="/gestion-citas">Gestión de citas</NavLink><NavLink to="/agenda">Agenda</NavLink></>)}
            {rol === 'admin' && (<><NavLink to="/admin">Administración</NavLink><NavLink to="/seguro">Portal público</NavLink></>)}
          </nav>
          {usuario ? (
            <button className="btn brand" type="button" onClick={salir}>Salir</button>
          ) : (
            <Link className="btn brand" to="/login">Iniciar sesión</Link>
          )}
        </div>
      </header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        <Outlet />
      </main>
      <footer>
        <div className="cols">
          <div className="brand">
            <Link className="logo" to="/" aria-label="Curar, inicio"><Cruz />Curar</Link>
            <p className="tag">Atención pública más cerca de ti.</p>
          </div>
          <div>
            <h3>Explora</h3>
            <ul>
              <li><Link to="/">Inicio</Link></li>
              <li><Link to="/seguro">Buscar médico</Link></li>
              <li><Link to="/centros">Centros de salud</Link></li>
              {!usuario && <li><Link to="/registro">Crear cuenta</Link></li>}
            </ul>
          </div>
          <div>
            <h3>Legal</h3>
            <ul>
              <li><a href="#">Términos y condiciones</a></li>
              <li><a href="#">Política de privacidad</a></li>
              <li><a href="#">Consentimiento de datos de salud</a></li>
              <li><Link to="/reclamaciones">Libro de Reclamaciones</Link></li>
            </ul>
          </div>
        </div>
        <div className="bottom">
          <p className="legal">Tus datos de salud son datos sensibles: los tratamos solo con tu autorización previa, libre, expresa e informada, conforme a la Ley 29733.</p>
          <p className="rights">© 2026 Curar · Demo académico</p>
        </div>
      </footer>
    </>
  );
}
