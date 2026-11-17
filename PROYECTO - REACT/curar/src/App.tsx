import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CitasProvider } from './context/CitasContext';
import { FlujoProvider } from './context/FlujoContext';
import { router } from './router';

/** Raíz de la aplicación: proveedores de estado global + enrutador. */
export default function App() {
  return (
    <AuthProvider>
      <FlujoProvider>
        <CitasProvider>
          <RouterProvider router={router} />
        </CitasProvider>
      </FlujoProvider>
    </AuthProvider>
  );
}
