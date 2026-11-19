import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCatalogo } from '../queries/catalogo';
import { useFlujo } from '../context/FlujoContext';
import { coincide } from '../utils/texto';
import { decimal1 } from '../utils/formato';

const ESPECIALIDADES = ['Medicina General', 'Pediatría', 'Cardiología', 'Ginecología', 'Geriatría'] as const;

export function Medicos() {
  const { activos, sedes, cargando, error } = useCatalogo();
  const { flujo } = useFlujo();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [esp, setEsp] = useState(flujo.especialidad);

  useEffect(() => {
    if (!flujo.seguro) void navigate('/seguro', { replace: true });
    else if (!flujo.sede) void navigate('/sede', { replace: true });
  }, [flujo.seguro, flujo.sede, navigate]);

  // Estado derivado: nada de useState/useEffect para la lista filtrada.
  const nombreSede = sedes.find((s) => s.id === flujo.sede)?.nombre ?? '';
  const visibles = activos.filter(
    (m) => m.sedeId === flujo.sede && (!esp || m.especialidad === esp) && coincide(m.nombre, nombre),
  );

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Buscar médicos</h1>
      <p style={{ margin: '8px 0 16px' }}>Paso 3 de 4 · {flujo.seguro} · {nombreSede} · <Link to="/sede" className="link">cambiar sede</Link></p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 20 }}>
        <label>Nombre del médico
          <input type="search" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Franco Espinola" />
        </label>
        <label>Especialidad
          <select value={esp} onChange={(e) => setEsp(e.target.value)}>
            <option value="">Todas</option>
            {ESPECIALIDADES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
      </div>
      <p className="err" role="alert">{error}</p>
      <div className="docs">
        {visibles.length === 0 ? (
          <p className="tabla" role="status">{cargando ? 'Cargando médicos…' : 'No se encontraron médicos en esta sede con esos filtros.'}</p>
        ) : (
          visibles.map((m) => (
            <article className="doccard" key={m.id}>
              <div className="ph">
                {m.foto ? <img src={m.foto} alt="" width={800} height={600} loading="lazy" /> : <div className="avatar" />}
              </div>
              <div className="t">
                <h3>{m.nombre}</h3>
                <small>{m.especialidad} · CMP {m.cmp ?? 's/n'}</small>
                <small>Horario: {m.horario[0]} – {m.horario[m.horario.length - 1]}</small>
                <div className="stars">★ {decimal1(m.calificacion)}</div>
                <Link className="btn ghost" style={{ margin: '12px 8px 0 0' }} to={`/medicos/${encodeURIComponent(m.id)}`}>Ver perfil</Link>
                <Link className="btn" style={{ marginTop: 12 }} to={`/reservar?medicoId=${encodeURIComponent(m.id)}`}>Reservar</Link>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
