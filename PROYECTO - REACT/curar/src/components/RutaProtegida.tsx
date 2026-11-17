import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tienePermiso } from '../types/cita';

interface RutaProtegidaProps {
  readonly permiso: number;
}

/** Equivale al guard `conPermiso(...)`: sin sesión va a /login; sin permiso, al inicio. */
export function RutaProtegida({ permiso }: RutaProtegidaProps) {
  const { usuario } = useAuth();
  if (usuario === null) return <Navigate to="/login" replace />;
  if (!tienePermiso(usuario.rol, permiso)) return <Navigate to="/" replace />;
  return <Outlet />;
}
