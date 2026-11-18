import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FieldMessage } from '../components/FieldMessage';
import { FiltroBotones } from '../components/FiltroBotones';
import { useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { CENTROS_MENSAJE, mensajeInicial, mensajeSchema, type MensajeData, type MensajeInput } from '../model/mensaje';
import { curarApi } from '../services/curarApi';
import type { Mensaje } from '../types/cita';

type Filtro = 'Todos' | 'Enviado' | 'Recibido';
const FILTROS: readonly Filtro[] = ['Todos', 'Enviado', 'Recibido'];

export function Mensajes() {
  const { usuario } = useAuth();
  const { cargando, error, ejecutar } = useCarga();
  const [lista, setLista] = useState<readonly Mensaje[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MensajeInput, unknown, MensajeData>({
    resolver: zodResolver(mensajeSchema),
    defaultValues: mensajeInicial(),
    mode: 'onBlur',
  });
  const dni = usuario?.dni;

  useEffect(() => {
    if (dni) void ejecutar(curarApi.mensajes(dni)).then((r) => r.ok && setLista(r.valor));
  }, [dni, ejecutar]);

  const q = busqueda.trim().toLocaleLowerCase('es-PE');
  const visibles = lista.filter(
    (m) => (filtro === 'Todos' || m.tipo === filtro) && (!q || `${m.centro} ${m.texto}`.toLocaleLowerCase('es-PE').includes(q)),
  );

  async function enviar(data: MensajeData): Promise<void> {
    if (!usuario) return;
    const r = await ejecutar(curarApi.crearMensaje({ dni: usuario.dni, ...data, tipo: 'Enviado', fecha: new Date().toISOString().slice(0, 10) }));
    if (!r.ok) return;
    setLista((l) => [r.valor, ...l]);
    reset(mensajeInicial());
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mensajes</h1>
      <label style={{ maxWidth: 420 }}>Buscar
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar mensaje" />
      </label>
      <FiltroBotones
        etiqueta="Filtrar mensajes" opciones={FILTROS} seleccionado={filtro} onChange={setFiltro}
        texto={(f) => (f === 'Todos' ? 'Todos' : `${f}s`)} estilo={{ display: 'flex', gap: 8, margin: '14px 0' }}
      />
      <p className="err" role="alert">{error}</p>
      {visibles.map((m) => (
        <article className="tabla" key={m.id ?? m.fecha + m.texto}>
          <b>{m.centro}</b> <span className="pill">{m.tipo}</span> <small>{m.fecha}</small><br />{m.texto}
        </article>
      ))}
      {visibles.length === 0 && !cargando && <p className="tabla" role="status">No hay mensajes en esta vista.</p>}
      <form className="tabla" onSubmit={handleSubmit(enviar)} noValidate style={{ display: 'grid', gap: 10, maxWidth: 560 }}>
        <h2 style={{ fontSize: 20 }}>Escribir a un centro</h2>
        <label>Centro
          <select {...register('centro')}>
            {CENTROS_MENSAJE.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Mensaje
          <input maxLength={300} aria-invalid={Boolean(errors.texto)} {...register('texto')} />
        </label>
        <FieldMessage id="texto-error" message={errors.texto?.message} />
        <button className="btn brand" type="submit" disabled={isSubmitting}>Enviar</button>
      </form>
    </section>
  );
}
