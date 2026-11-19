import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './styles.css';
import App from './App';
import { crearClienteConsultas } from './queries/cliente';

// Una sola caché para toda la app (equivale a los servicios singleton con BehaviorSubject de Angular).
const consultas = crearClienteConsultas();

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('No se encontró el elemento #root en index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={consultas}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
