import { Link, useNavigate } from 'react-router-dom';
import { useFlujo } from '../context/FlujoContext';
import type { Seguro } from '../types/cita';

const SEGUROS: readonly { readonly id: Seguro; readonly texto: string }[] = [
  { id: 'EsSalud', texto: 'Para asegurados de EsSalud.' },
  { id: 'SIS', texto: 'Seguro Integral de Salud.' },
];

export function ElegirSeguro() {
  const { flujo, actualizarFlujo } = useFlujo();
  const navigate = useNavigate();

  function elegir(seguro: Seguro): void {
    actualizarFlujo({ seguro, sede: null });
    void navigate('/sede');
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>¿Con qué seguro te atiendes?</h1>
      <p style={{ margin: '8px 0 24px' }}>Paso 1 de 4 · Solo verás las sedes y médicos que te correspondan.</p>
      <div className="docs">
        {SEGUROS.map((s) => (
          <article className="tabla" key={s.id}>
            <h2 style={{ fontSize: 22 }}>{s.id}</h2>
            <p>{s.texto}</p>
            <button className="btn" style={{ marginTop: 12 }} type="button" aria-pressed={flujo.seguro === s.id} onClick={() => elegir(s.id)}>Elegir {s.id}</button>
          </article>
        ))}
      </div>
      <Link to="/" className="btn ghost" style={{ marginTop: 20 }}>Volver</Link>
    </section>
  );
}
