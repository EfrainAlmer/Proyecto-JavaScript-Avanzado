import { Suspense, useEffect } from 'react';
import { Link, Outlet, useMatches } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_ADMIN, ROLE_MEDICO } from '../types/cita';
import { Cruz } from './Logo';

type RolVista = 'anonimo' | 'paciente' | 'medico' | 'admin';

interface RutaHandle {
  readonly titulo?: string;
}

export function Layout() {
  const { usuario, salir } = useAuth();
  const matches = useMatches();

  // Título del documento: el de la ruta más específica que lo defina.
  const titulo = matches.map((m) => (m.handle as RutaHandle | undefined)?.titulo).findLast(Boolean);
  useEffect(() => {
    document.title = titulo ?? 'Curar';
  }, [titulo]);

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
            {rol === 'anonimo' && (<><Link to="/">Inicio</Link><Link to="/seguro">Buscar médico</Link><Link to="/centros">Centros</Link></>)}
            {rol === 'paciente' && (
              <>
                <Link to="/panel">Mi panel</Link><Link to="/citas">Mis citas</Link><Link to="/recetas">Recetas</Link>
                <Link to="/mensajes">Mensajes</Link><Link to="/centros">Centros</Link><Link to="/cuenta">Mi cuenta</Link>
              </>
            )}
            {rol === 'medico' && (<><Link to="/panel-medico">Mi panel</Link><Link to="/gestion-citas">Gestión de citas</Link><Link to="/agenda">Agenda</Link></>)}
            {rol === 'admin' && (<><Link to="/admin">Administración</Link><Link to="/seguro">Portal público</Link></>)}
          </nav>
          {usuario ? (
            <button className="btn brand" type="button" onClick={salir}>Salir</button>
          ) : (
            <Link className="btn brand" to="/login">Iniciar sesión</Link>
          )}
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Suspense fallback={<p className="wrap" role="status" style={{ padding: '48px 20px' }}>Cargando…</p>}>
          <Outlet />
        </Suspense>
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
