import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useFlujo } from '../context/FlujoContext';
import { useCatalogo } from '../queries/catalogo';

const TIPOS = ['Todos', 'Hospitales', 'Policlínicos', 'Clínicas'] as const;

export function ElegirSede() {
  const { sedes, cargando, error } = useCatalogo();
  const { flujo, actualizarFlujo } = useFlujo();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<string>(flujo.tipo || 'Todos');

  useEffect(() => {
    if (!flujo.seguro) void navigate('/seguro', { replace: true });
  }, [flujo.seguro, navigate]);

  // Derivado: se calcula en el render a partir de las sedes y los filtros.
  const visibles = sedes.filter((s) => (!flujo.seguro || s.seguros.includes(flujo.seguro)) && (tipo === 'Todos' || s.tipo === tipo));

  function elegir(id: string): void {
    actualizarFlujo({ sede: id });
    void navigate('/medicos');
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Elige tu sede</h1>
      <p style={{ margin: '8px 0 16px' }}>Paso 2 de 4 · Seguro: <b>{flujo.seguro}</b> · <Link to="/seguro" className="link">cambiar</Link></p>
      <div role="group" aria-label="Tipo de centro" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TIPOS.map((t) => (
          <button key={t} type="button" className={`btn${tipo === t ? '' : ' ghost'}`} aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t}</button>
        ))}
      </div>
      <p className="err" role="alert">{error}</p>
      <div className="docs">
        {visibles.length === 0 ? (
          <p className="tabla" role="status">{cargando ? 'Cargando sedes…' : 'No hay sedes para ese seguro y tipo de centro.'}</p>
        ) : (
          visibles.map((s) => (
            <article className="tabla" key={s.id}>
              <h2 style={{ fontSize: 20 }}>{s.nombre}</h2>
              <span className="pill">{s.tipo}</span>
              <p style={{ margin: '8px 0' }}>{s.direccion}</p>
              <button className="btn" type="button" onClick={() => elegir(s.id)}>Elegir sede</button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
