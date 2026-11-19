import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RutaProtegida } from './components/RutaProtegida';
import { AuthProvider } from './context/AuthContext';
import { FlujoProvider } from './context/FlujoContext';
import { Admin } from './pages/Admin';
import { Agenda } from './pages/Agenda';
import { Centros } from './pages/Centros';
import { Citas } from './pages/Citas';
import { Consulta } from './pages/Consulta';
import { CuentaPaciente } from './pages/CuentaPaciente';
import { ElegirSede } from './pages/ElegirSede';
import { ElegirSeguro } from './pages/ElegirSeguro';
import { Familiares } from './pages/Familiares';
import { GestionCitas } from './pages/GestionCitas';
import { Historial } from './pages/Historial';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Medicos } from './pages/Medicos';
import { Mensajes } from './pages/Mensajes';
import { NoEncontrada } from './pages/NoEncontrada';
import { PanelMedico } from './pages/PanelMedico';
import { PanelPaciente } from './pages/PanelPaciente';
import { PerfilMedico } from './pages/PerfilMedico';
import { Recetas } from './pages/Recetas';
import { Reclamaciones } from './pages/Reclamaciones';
import { Registro } from './pages/Registro';
import { Reservar } from './pages/Reservar';
import { Verificar } from './pages/Verificar';
import { PERM_GESTIONAR, PERM_RECETAR, PERM_RESERVAR } from './types/cita';

/** Raíz de la aplicación: estado de sesión y del flujo de reserva + tabla de rutas. Los datos remotos viven en TanStack Query (main.tsx). */
export default function App() {
  return (
    <AuthProvider>
      <FlujoProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Públicas */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="registro" element={<Registro />} />
            <Route path="verificar" element={<Verificar />} />
            <Route path="seguro" element={<ElegirSeguro />} />
            <Route path="sede" element={<ElegirSede />} />
            <Route path="medicos" element={<Medicos />} />
            <Route path="medicos/:id" element={<PerfilMedico />} />
            <Route path="centros" element={<Centros />} />
            <Route path="reclamaciones" element={<Reclamaciones />} />

            {/* Paciente */}
            <Route element={<RutaProtegida permiso={PERM_RESERVAR} />}>
              <Route path="panel" element={<PanelPaciente />} />
              <Route path="citas" element={<Citas />} />
              <Route path="reservar" element={<Reservar />} />
              <Route path="recetas" element={<Recetas />} />
              <Route path="historial" element={<Historial />} />
              <Route path="familiares" element={<Familiares />} />
              <Route path="mensajes" element={<Mensajes />} />
              <Route path="cuenta" element={<CuentaPaciente />} />
            </Route>

            {/* Médico */}
            <Route element={<RutaProtegida permiso={PERM_RECETAR} />}>
              <Route path="panel-medico" element={<PanelMedico />} />
              <Route path="gestion-citas" element={<GestionCitas />} />
              <Route path="consulta/:id" element={<Consulta />} />
              <Route path="agenda" element={<Agenda />} />
            </Route>

            {/* Administrador */}
            <Route element={<RutaProtegida permiso={PERM_GESTIONAR} />}>
              <Route path="admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<NoEncontrada />} />
          </Route>
        </Routes>
      </FlujoProvider>
    </AuthProvider>
  );
}
