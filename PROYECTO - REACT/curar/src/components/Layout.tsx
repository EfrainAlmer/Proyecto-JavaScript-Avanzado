import { useEffect, useLayoutEffect, useRef, useState, ViewTransition } from 'react';
import { useConexion } from '../hooks/useConexion';
import { Link, matchPath, NavLink, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Cruz } from './Logo';
import { ROLE_ADMIN, ROLE_MEDICO } from '../types/cita';

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
  const cabeceraRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const [bordesNav, setBordesNav] = useState({ inicio: true, final: true });
  const enLinea = useConexion();

  /**
   * Lab 13 · useLayoutEffect: la cabecera es `position: sticky` y su alto cambia (el menú se parte en 2 líneas
   * a 360 px, o según el rol). Sin compensarlo, al recorrer con Tab/Shift+Tab el campo enfocado puede quedar
   * DEBAJO de la cabecera (WCAG 2.4.11). Se mide el DOM y se fija `scroll-padding-top` antes del pintado y antes
   * de los useEffect, así el foco que mueve el efecto de abajo ya usa el margen correcto.
   */
  useLayoutEffect(() => {
    const cabecera = cabeceraRef.current;
    if (!cabecera) return;
    const raiz = document.documentElement;
    const aplicar = (): void => raiz.style.setProperty('scroll-padding-top', `${cabecera.offsetHeight + 8}px`);
    aplicar();
    if (typeof ResizeObserver === 'undefined') return () => raiz.style.removeProperty('scroll-padding-top');
    const observador = new ResizeObserver(aplicar);
    observador.observe(cabecera);
    return () => {
      observador.disconnect();
      raiz.style.removeProperty('scroll-padding-top');
    };
  }, []);

  // Al cambiar de ruta: actualiza el título y lleva el foco al contenido (accesibilidad).
  useEffect(() => {
    document.title = tituloDe(pathname);
    mainRef.current?.focus();
  }, [pathname]);

  /** En móvil el menú se desplaza en horizontal: se lleva a la vista el enlace activo y un degradado avisa en qué lado quedan más enlaces. */
  function revisarNav(): void {
    const nav = navRef.current;
    if (nav) setBordesNav({ inicio: nav.scrollLeft <= 4, final: nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 4 });
  }
  useEffect(() => {
    const nav = navRef.current;
    const activo = nav?.querySelector<HTMLElement>('a.active');
    if (nav && activo) {
      // Solo se desplaza si el enlace activo no se ve entero; si cabe, el menú empieza desde la izquierda.
      const derecha = activo.offsetLeft + activo.offsetWidth;
      nav.scrollLeft = derecha > nav.clientWidth ? derecha - nav.clientWidth + 24 : 0;
    }
    revisarNav();
  }, [pathname, usuario]);

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
      <header className="top" ref={cabeceraRef}>
        <div className="bar">
          <Link className="logo" to="/" aria-label="Curar, inicio"><Cruz />Curar</Link>
          <nav aria-label="Principal" ref={navRef} onScroll={revisarNav} data-inicio={bordesNav.inicio} data-final={bordesNav.final}>
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
        {/* Dentro de la cabecera fija: no la tapa y su alto entra en la medición de useLayoutEffect. */}
        {!enLinea && (
          <p className="sin-red" role="status">
            Sin conexión a internet. Lo que ves puede estar desactualizado y las acciones fallarán hasta que vuelva la red.
          </p>
        )}
      </header>
      <main id="main" tabIndex={-1} ref={mainRef}>
        {/* View Transitions (React 19): BrowserRouter navega dentro de startTransition, así que al cambiar de ruta
            la página saliente se desvanece y la nueva entra. key = ruta: solo anima al navegar; default="none" evita
            animar las actualizaciones internas (filtros diferidos, pestañas). Sin soporte del navegador, no hace nada. */}
        <ViewTransition key={pathname} enter="vt-entrar" exit="vt-salir" default="none">
          <div>
            <Outlet />
          </div>
        </ViewTransition>
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
