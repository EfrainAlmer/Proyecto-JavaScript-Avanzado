import { Link } from 'react-router-dom';

export function NoEncontrada() {
  return (
    <section className="wrap" style={{ padding: '64px 20px' }}>
      <h1>Página no encontrada</h1>
      <p>La dirección no corresponde a una vista de Curar.</p>
      <Link to="/" className="btn">Volver al inicio</Link>
    </section>
  );
}
