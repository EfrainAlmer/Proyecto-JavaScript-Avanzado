import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { decimal1 } from '../utils/formato';
import { BotonFavorito } from '../components/BotonFavorito';
import { valoracion } from '../utils/valoracion';

export function PerfilMedico() {
  const { id = '' } = useParams();
  const { usuario } = useAuth();
  const { medicos, sedes, cargando, error, cargarMedicos, cargarSedes, cargarFavoritos } = useCitas();
  const dni = usuario?.dni;

  useEffect(() => {
    cargarMedicos();
    cargarSedes();
    if (dni) cargarFavoritos(dni);
  }, [dni, cargarMedicos, cargarSedes, cargarFavoritos]);

  const m = medicos.find((x) => x.id === id);
  const sede = sedes.find((s) => s.id === m?.sedeId)?.nombre ?? 'Sede por asignar';

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      {m ? (
        <>
          <p style={{ marginBottom: 12 }}><Link to="/medicos" className="link">← Volver a médicos</Link></p>
          <div className="tabla" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            {m.foto ? (
              <img src={m.foto} alt={`Foto de ${m.nombre}`} width={96} height={96} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} />
            ) : (
              <div className="avatar" style={{ width: 96, height: 96 }} />
            )}
            <div>
              <h1 style={{ fontSize: 28 }}>{m.nombre}</h1>
              <p>{m.especialidad} · CMP {m.cmp ?? 's/n'}</p>
              <p className="stars" aria-label={`Calificación ${m.calificacion} de 5`}>★ {decimal1(m.calificacion)} · {valoracion(m.calificacion)}</p>
            </div>
          </div>
          <div className="tabla">
            <h2 style={{ fontSize: 20 }}>Formación y experiencia</h2>
            <p>{m.universidad ?? 'No registrada'}</p>
            <p>{m.experiencia ?? 'Sin información adicional.'}</p>
          </div>
          <div className="tabla">
            <h2 style={{ fontSize: 20 }}>Reconocimientos</h2>
            {(m.reconocimientos ?? []).length > 0 ? (m.reconocimientos ?? []).map((r) => <p key={r}>★ {r}</p>) : <p>Aún no hay reconocimientos registrados.</p>}
          </div>
          <div className="tabla">
            <h2 style={{ fontSize: 20 }}>Sede y horario</h2>
            <p>{sede}</p>
            <p>Horario: {m.horario.join(' · ')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link className="btn brand" to={`/reservar?medicoId=${encodeURIComponent(m.id)}`}>Reservar con {m.nombre}</Link>
            {usuario && (
              <BotonFavorito medicoId={id} className={() => 'btn ghost'}>
                {(fav) => (fav ? '★ Quitar de favoritos' : '☆ Agregar a favoritos')}
              </BotonFavorito>
            )}
          </div>
        </>
      ) : (
        <p className="tabla" role="status">{cargando ? 'Cargando perfil…' : 'No encontramos a este médico.'}</p>
      )}
      <p className="err" role="alert">{error}</p>
    </section>
  );
}
