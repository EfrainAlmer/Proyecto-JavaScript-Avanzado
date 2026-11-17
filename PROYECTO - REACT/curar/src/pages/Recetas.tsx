import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { curarApi } from '../services/curarApi';
import type { Receta } from '../types/cita';

export function Recetas() {
  const { usuario } = useAuth();
  const { cargando, error, ejecutar } = useCarga();
  const [recetas, setRecetas] = useState<readonly Receta[]>([]);
  const dni = usuario?.dni;

  useEffect(() => {
    if (!dni) return;
    // Las más recientes primero, sin mutar el arreglo recibido.
    void ejecutar(curarApi.recetas(dni)).then((r) => r.ok && setRecetas([...r.valor].reverse()));
  }, [dni, ejecutar]);

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mis recetas médicas</h1>
      <p className="err" role="alert">{error}</p>
      {cargando && <p role="status">Cargando…</p>}
      {recetas.map((r) => (
        <article className="tabla" key={r.id ?? r.fecha + r.medicamento}>
          <b>{r.fecha}</b> · Dr(a). {r.medicoNombre}<br />{r.medicamento} — {r.cantidad} envase(s)<br /><small>{r.indicaciones}</small>
        </article>
      ))}
      {recetas.length === 0 && !cargando && <p className="tabla" role="status">Aún no tienes recetas registradas.</p>}
    </section>
  );
}
