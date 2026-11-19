import { zodResolver } from '@hookform/resolvers/zod';
import {  useState } from 'react';
import { useForm } from 'react-hook-form';
import { Campo } from '../components/Campo';
import { FiltroBotones } from '../components/FiltroBotones';
import { useAuth } from '../context/AuthContext';
import { CENTROS_MENSAJE, mensajeInicial, mensajeSchema, type MensajeData, type MensajeInput } from '../model/mensaje';
import { coincide } from '../utils/texto';
import { useMensajes, useCrearMensaje } from '../queries/cuentas';
import { textoError } from '../services/mensajeHttp';

type Filtro = 'Todos' | 'Enviado' | 'Recibido';
const FILTROS: readonly Filtro[] = ['Todos', 'Enviado', 'Recibido'];

export function Mensajes() {
  const { usuario } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MensajeInput, unknown, MensajeData>({
    resolver: zodResolver(mensajeSchema),
    defaultValues: mensajeInicial(),
    mode: 'onBlur',
  });
  const dni = usuario?.dni;
  const lectura = useMensajes(dni);
  const crearMensaje = useCrearMensaje();
  // Los más recientes primero (la API los devuelve en orden de creación).
  const lista = (lectura.data ?? []).toReversed();
  const cargando = lectura.isLoading;

  const visibles = lista.filter(
    (m) => (filtro === 'Todos' || m.tipo === filtro) && coincide(`${m.centro} ${m.texto}`, busqueda),
  );

  async function enviar(data: MensajeData): Promise<void> {
    if (!usuario) return;
    try {
      await crearMensaje.mutateAsync({ dni: usuario.dni, ...data, tipo: 'Enviado', fecha: new Date().toISOString().slice(0, 10) });
      reset(mensajeInicial()); // la lista se recarga sola (invalidación de ['mensajes', dni])
    } catch {
      // crearMensaje.error se muestra junto al formulario; lo escrito no se pierde.
    }
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
      <p className="err" role="alert">{textoError(lectura.error)}</p>
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
        <Campo label="Mensaje" error={errors.texto?.message}>{(a11y) => <input maxLength={300} {...a11y} {...register('texto')} />}</Campo>
        <button className="btn brand" type="submit" disabled={isSubmitting || crearMensaje.isPending}>Enviar</button>
        {crearMensaje.error && <p className="err" role="alert">No se envió el mensaje. {textoError(crearMensaje.error)}</p>}
      </form>
    </section>
  );
}
