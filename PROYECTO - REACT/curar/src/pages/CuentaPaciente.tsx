import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { Campo } from '../components/Campo';
import { useAuth } from '../context/AuthContext';
import { claveInicial, claveSchema, perfilInicial, perfilSchema, SEGUROS_CUENTA,
  type ClaveData, type ClaveInput, type PerfilData, type PerfilInput,
} from '../model/cuenta';
import { useCitasPaciente } from '../queries/citas';
import { curarApi } from '../services/curarApi';
import { PERM_RECETAR, PERM_RESERVAR, tienePermiso } from '../types/cita';
import { mesAnio, fechaHora } from '../utils/formato';
import { useUsuario, useActualizarUsuario } from '../queries/cuentas';
import { mensajeHttp, textoError } from '../services/mensajeHttp';

type Tab = 'resumen' | 'perfil';
const TABS: readonly { readonly id: Tab; readonly n: string }[] = [{ id: 'resumen', n: 'Resumen' }, { id: 'perfil', n: 'Mi perfil' }];

export function CuentaPaciente() {
  const auth = useAuth();
  const citas = useCitasPaciente(auth.usuario?.dni).data ?? [];
  const [tab, setTab] = useState<Tab>('resumen');
  const [okPerfil, setOkPerfil] = useState('');
  const [okClave, setOkClave] = useState('');
  // Dos formularios independientes en la misma página: cada uno con su propio useForm.
  const perfil = useForm<PerfilInput, unknown, PerfilData>({ resolver: zodResolver(perfilSchema), defaultValues: perfilInicial(), mode: 'onBlur' });
  const clave = useForm<ClaveInput, unknown, ClaveData>({ resolver: zodResolver(claveSchema), defaultValues: claveInicial(), mode: 'onBlur' });
  const { reset: reiniciarPerfil } = perfil;
  const ep = perfil.formState.errors;
  const ec = clave.formState.errors;
  const dni = auth.usuario?.dni;
  const lectura = useUsuario(dni);
  const actualizar = useActualizarUsuario();
  const u = lectura.data ?? null; // antes era un useState que copiaba la respuesta
  const precargado = useRef(false);

  // Precarga el formulario UNA vez: si se recargara con cada refetch, borraría lo que la persona está escribiendo.
  useEffect(() => {
    if (!u || precargado.current) return;
    precargado.current = true;
    const seguro = SEGUROS_CUENTA.find((s) => s === u.seguro) ?? 'SIS';
    reiniciarPerfil({ nombre: u.nombre, correo: u.correo ?? '', telefono: u.telefono ?? '', seguro });
  }, [u, reiniciarPerfil]);

  // Derivados
  const rol = auth.usuario?.rol ?? 0;
  const permisos = [
    { t: 'Reservar citas médicas', a: tienePermiso(rol, PERM_RESERVAR) },
    { t: 'Emitir recetas digitales', a: tienePermiso(rol, PERM_RECETAR) },
  ];
  const proximas = citas
    .filter((c) => c.estado === 'Pendiente' || c.estado === 'Confirmada')
    .toSorted((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .slice(0, 3);

  async function guardarPerfil(data: PerfilData): Promise<void> {
    setOkPerfil('');
    if (!u?.id) return;
    try {
      // Regla que depende de otras cuentas: se consulta al enviar (no es un dato que esta pantalla muestre).
      if (await curarApi.correoUsado(data.correo, u.dni)) {
        perfil.setError('correo', { message: 'Ese correo ya está registrado por otra cuenta.' });
        return;
      }
      const guardado = await actualizar.mutateAsync({ id: u.id, cambios: data });
      auth.renombrar(guardado.nombre);
      setOkPerfil('Tus datos se actualizaron correctamente.');
    } catch (e) {
      perfil.setError('root.server', { message: mensajeHttp(e) });
    }
  }

  async function guardarClave(data: ClaveData): Promise<void> {
    setOkClave('');
    if (!u?.id) return;
    if (String(u.password) !== data.actual) {
      clave.setError('actual', { message: 'La contraseña actual no es correcta.' });
      return;
    }
    try {
      await actualizar.mutateAsync({ id: u.id, cambios: { password: data.nueva } });
      clave.reset(claveInicial());
      setOkClave('Contraseña actualizada.');
    } catch (e) {
      clave.setError('root.server', { message: mensajeHttp(e) });
    }
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mi cuenta</h1>
      <div role="tablist" aria-label="Secciones de mi cuenta" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className={`btn${tab === t.id ? '' : ' ghost'}`} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.n}</button>
        ))}
      </div>
      <p className="err" role="alert">{textoError(lectura.error)}</p>
      {tab === 'resumen' ? (
        u ? (
          <div className="docs">
            <article className="tabla">
              <h2 style={{ fontSize: 20 }}>Ficha de identificación</h2>
              <p><b>DNI</b> {u.dni}</p>
              <p><b>Correo</b> {u.correo}</p>
              <p><b>Celular</b> {u.telefono}</p>
              <p><b>Cobertura</b> {u.seguro ?? 'No especificada'}</p>
              <p><b>Miembro desde</b> {u.creadoEn ? mesAnio(new Date(u.creadoEn)) : '—'}</p>
            </article>
            <article className="tabla">
              <h2 style={{ fontSize: 20 }}>Próximas citas</h2>
              {proximas.length > 0 ? (
                proximas.map((c) => (
                  <p key={c.id}>{fechaHora(c.fecha, c.hora)} — {c.seguro} <span className="pill" data-estado={c.estado}>{c.estado}</span></p>
                ))
              ) : (
                <p>Aún no tienes citas. <Link to="/seguro" className="link">Reserva una</Link>.</p>
              )}
            </article>
            <article className="tabla">
              <h2 style={{ fontSize: 20 }}>Permisos</h2>
              {permisos.map((p) => <p key={p.t}>{p.a ? '✓' : '✕'} {p.t}</p>)}
            </article>
          </div>
        ) : (
          <p role="status">Cargando tu información…</p>
        )
      ) : (
        <div className="docs">
          <form className="tabla" onSubmit={perfil.handleSubmit(guardarPerfil)} noValidate style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Editar datos personales</h2>
            <Campo label="Nombre completo" error={ep.nombre?.message}>{(a11y) => <input {...a11y} {...perfil.register('nombre')} />}</Campo>
            <Campo label="Correo electrónico" error={ep.correo?.message}>{(a11y) => <input type="email" {...a11y} {...perfil.register('correo')} />}</Campo>
            <Campo label="Celular" error={ep.telefono?.message}>{(a11y) => <input inputMode="numeric" maxLength={9} {...a11y} {...perfil.register('telefono')} />}</Campo>
            <label>Seguro
              <select {...perfil.register('seguro')}>{SEGUROS_CUENTA.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <button className="btn brand" type="submit" disabled={perfil.formState.isSubmitting}>Guardar cambios</button>
            {ep.root?.['server'] && <p className="err" role="alert">No se guardaron tus datos. {ep.root['server'].message}</p>}
            <p role="status" aria-live="polite">{okPerfil}</p>
          </form>
          <form className="tabla" onSubmit={clave.handleSubmit(guardarClave)} noValidate style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Cambiar contraseña</h2>
            <Campo label="Contraseña actual" error={ec.actual?.message}>{(a11y) => <input type="password" autoComplete="current-password" {...a11y} {...clave.register('actual')} />}</Campo>
            <Campo label="Nueva contraseña" error={ec.nueva?.message}>{(a11y) => <input type="password" autoComplete="new-password" {...a11y} {...clave.register('nueva')} />}</Campo>
            <Campo label="Repite la nueva contraseña" error={ec.confirmar?.message}>{(a11y) => <input type="password" autoComplete="new-password" {...a11y} {...clave.register('confirmar')} />}</Campo>
            <button className="btn brand" type="submit" disabled={clave.formState.isSubmitting}>Actualizar contraseña</button>
            {ec.root?.['server'] && <p className="err" role="alert">No se cambió la contraseña. {ec.root['server'].message}</p>}
            <p role="status" aria-live="polite">{okClave}</p>
          </form>
        </div>
      )}
    </section>
  );
}
