import { useState } from 'react';
import { Link } from 'react-router';
import { FiltroBotones } from '../components/FiltroBotones';
import { FiltroFechas } from '../components/FiltroFechas';
import { dentroDelRango, type RangoFechasData } from '../model/rango';
import { useAuth } from '../context/AuthContext';
import { useCatalogo } from '../queries/catalogo';
import { useCitasPaciente, useRecetas } from '../queries/citas';
import { textoError } from '../services/mensajeHttp';

type Tipo = 'Todos' | 'Atención' | 'Receta';
const TIPOS: readonly Tipo[] = ['Todos', 'Atención', 'Receta'];

interface Item {
  readonly id: string;
  readonly fecha: string;
  readonly tipo: 'Atención' | 'Receta';
  readonly paciente: string;
  readonly medico: string;
  readonly detalle: string;
}

export function Historial() {
  const { usuario } = useAuth();
  const { medicos } = useCatalogo(); // médicos y sedes: caché de TanStack Query
  const [tipo, setTipo] = useState<Tipo>('Todos');
  const [quien, setQuien] = useState('');
  const [rango, setRango] = useState<RangoFechasData | null>(null); // último rango aplicado (ya validado)
  const dni = usuario?.dni;
  const lecturaCitas = useCitasPaciente(dni);
  const lecturaRecetas = useRecetas(dni);
  const citas = lecturaCitas.data ?? [];
  const recetas = lecturaRecetas.data ?? [];
  const cargando = lecturaCitas.isLoading || lecturaRecetas.isLoading;

  // Todo lo siguiente es estado derivado: se recalcula en cada render.
  const nombreMedico = (id: string): string => medicos.find((m) => m.id === id)?.nombre ?? id;
  const atenciones = citas
    .filter((c) => c.estado === 'Atendida')
    .map((c): Item => ({ id: `c${c.id}`, fecha: c.fecha, tipo: 'Atención', paciente: c.paciente ?? 'Titular', medico: nombreMedico(c.medicoId), detalle: c.motivo ?? 'Consulta médica' }));
  const deRecetas = recetas.map((r): Item => ({
    id: `r${r.id ?? r.fecha + r.medicamento}`, fecha: r.fecha, tipo: 'Receta', paciente: r.paciente || 'Titular',
    medico: `Dr(a). ${r.medicoNombre}`, detalle: `${r.medicamento} — ${r.cantidad} envase(s). ${r.indicaciones}`,
  }));
  const items = [...atenciones, ...deRecetas].toSorted((a, b) => b.fecha.localeCompare(a.fecha));
  const nombres = [...new Set(items.map((i) => i.paciente))];
  const visibles = items.filter((i) => (tipo === 'Todos' || i.tipo === tipo) && (!quien || i.paciente === quien) && (!rango || dentroDelRango(i.fecha, rango)));

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Historial médico</h1>
      <p style={{ margin: '6px 0 16px' }}>Atenciones recibidas y recetas emitidas, de la más reciente a la más antigua.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end', marginBottom: 16 }}>
        <FiltroBotones etiqueta="Tipo de registro" opciones={TIPOS} seleccionado={tipo} onChange={setTipo} estilo={{ display: 'flex', gap: 8 }} />
        <label style={{ minWidth: 220 }}>Paciente
          <select value={quien} onChange={(e) => setQuien(e.target.value)}>
            <option value="">Todos</option>
            {nombres.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <FiltroFechas onAplicar={setRango} />
      <p className="err" role="alert">{textoError(lecturaCitas.error ?? lecturaRecetas.error)}</p>
      {visibles.length === 0 ? (
        <p className="tabla" role="status">{cargando ? 'Cargando…' : items.length > 0 ? 'No hay registros con estos filtros.' : 'Aún no hay registros en tu historial.'}</p>
      ) : (
        visibles.map((i) => (
          <article className="tabla" key={i.id}>
            <span className="pill">{i.tipo}</span> <b>{i.fecha}</b> · {i.paciente}<br />{i.medico}<br /><small>{i.detalle}</small>
          </article>
        ))
      )}
      <p style={{ marginTop: 16 }}><Link to="/recetas" className="btn ghost">Ver solo recetas</Link></p>
    </section>
  );
}
