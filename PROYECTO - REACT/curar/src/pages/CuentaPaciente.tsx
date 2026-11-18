import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { FieldMessage } from '../components/FieldMessage';
import { useAuth } from '../context/AuthContext';
import { useCitas } from '../context/CitasContext';
import { useCarga } from '../hooks/useCarga';
import {
  claveInicial, claveSchema, perfilInicial, perfilSchema, SEGUROS_CUENTA,
  type ClaveData, type ClaveInput, type PerfilData, type PerfilInput,
} from '../model/cuenta';
import { curarApi } from '../services/curarApi';
import { PERM_RECETAR, PERM_RESERVAR, tienePermiso, type UsuarioApi } from '../types/cita';
import { mesAnio } from '../utils/formato';

type Tab = 'resumen' | 'perfil';
const TABS: readonly { readonly id: Tab; readonly n: string }[] = [{ id: 'resumen', n: 'Resumen' }, { id: 'perfil', n: 'Mi perfil' }];

export function CuentaPaciente() {
  const auth = useAuth();
  const { citas, cargarCitas } = useCitas();
  const { error, ejecutar } = useCarga();
  const [tab, setTab] = useState<Tab>('resumen');
  const [u, setU] = useState<UsuarioApi | null>(null);
  const [okPerfil, setOkPerfil] = useState('');
  const [okClave, setOkClave] = useState('');
  // Dos formularios independientes en la misma página: cada uno con su propio useForm.
  const perfil = useForm<PerfilInput, unknown, PerfilData>({ resolver: zodResolver(perfilSchema), defaultValues: perfilInicial(), mode: 'onBlur' });
  const clave = useForm<ClaveInput, unknown, ClaveData>({ resolver: zodResolver(claveSchema), defaultValues: claveInicial(), mode: 'onBlur' });
  const { reset: reiniciarPerfil } = perfil;
  const ep = perfil.formState.errors;
  const ec = clave.formState.errors;
  const dni = auth.usuario?.dni;

  useEffect(() => {
    if (!dni) return;
    cargarCitas(dni);
    void ejecutar(curarApi.usuarios(dni)).then((r) => {
      const x = r.ok ? r.valor[0] : undefined;
      if (!x) return;
      setU(x);
      const seguro = SEGUROS_CUENTA.find((s) => s === x.seguro) ?? 'SIS';
      reiniciarPerfil({ nombre: x.nombre, correo: x.correo ?? '', telefono: x.telefono ?? '', seguro });
    });
  }, [dni, cargarCitas, ejecutar, reiniciarPerfil]);

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
    const usado = await ejecutar(curarApi.correoUsado(data.correo, String(u.dni)));
    if (!usado.ok) return;
    if (usado.valor) {
      perfil.setError('correo', { message: 'Ese correo ya está registrado por otra cuenta.' });
      return;
    }
    const r = await ejecutar(curarApi.actualizarUsuario(u.id, data));
    if (!r.ok) return;
    setU(r.valor);
    auth.renombrar(r.valor.nombre);
    setOkPerfil('Tus datos se actualizaron correctamente.');
  }

  async function guardarClave(data: ClaveData): Promise<void> {
    setOkClave('');
    if (!u?.id) return;
    if (String(u.password) !== data.actual) {
      clave.setError('actual', { message: 'La contraseña actual no es correcta.' });
      return;
    }
    const r = await ejecutar(curarApi.actualizarUsuario(u.id, { password: data.nueva }));
    if (!r.ok) return;
    setU(r.valor);
    clave.reset(claveInicial());
    setOkClave('Contraseña actualizada.');
  }

  return (
    <section className="wrap" style={{ padding: '48px 20px' }}>
      <h1>Mi cuenta</h1>
      <div role="tablist" aria-label="Secciones de mi cuenta" style={{ display: 'flex', gap: 8, margin: '16px 0' }}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" className={`btn${tab === t.id ? '' : ' ghost'}`} aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.n}</button>
        ))}
      </div>
      <p className="err" role="alert">{error}</p>
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
                  <p key={c.id}>{c.fecha} · {c.hora} — {c.seguro} <span className="pill" data-estado={c.estado}>{c.estado}</span></p>
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
            <label>Nombre completo<input aria-invalid={Boolean(ep.nombre)} {...perfil.register('nombre')} /></label>
            <FieldMessage id="nombre-error" message={ep.nombre?.message} />
            <label>Correo electrónico<input type="email" aria-invalid={Boolean(ep.correo)} {...perfil.register('correo')} /></label>
            <FieldMessage id="correo-error" message={ep.correo?.message} />
            <label>Celular<input inputMode="numeric" maxLength={9} aria-invalid={Boolean(ep.telefono)} {...perfil.register('telefono')} /></label>
            <FieldMessage id="telefono-error" message={ep.telefono?.message} />
            <label>Seguro
              <select {...perfil.register('seguro')}>{SEGUROS_CUENTA.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <button className="btn brand" type="submit" disabled={perfil.formState.isSubmitting}>Guardar cambios</button>
            <p role="status" aria-live="polite">{okPerfil}</p>
          </form>
          <form className="tabla" onSubmit={clave.handleSubmit(guardarClave)} noValidate style={{ display: 'grid', gap: 10 }}>
            <h2 style={{ fontSize: 20 }}>Cambiar contraseña</h2>
            <label>Contraseña actual<input type="password" autoComplete="current-password" aria-invalid={Boolean(ec.actual)} {...clave.register('actual')} /></label>
            <FieldMessage id="actual-error" message={ec.actual?.message} />
            <label>Nueva contraseña<input type="password" autoComplete="new-password" aria-invalid={Boolean(ec.nueva)} {...clave.register('nueva')} /></label>
            <FieldMessage id="nueva-error" message={ec.nueva?.message} />
            <label>Repite la nueva contraseña<input type="password" autoComplete="new-password" aria-invalid={Boolean(ec.confirmar)} {...clave.register('confirmar')} /></label>
            <FieldMessage id="confirmar-error" message={ec.confirmar?.message} />
            <button className="btn brand" type="submit" disabled={clave.formState.isSubmitting}>Actualizar contraseña</button>
            <p role="status" aria-live="polite">{okClave}</p>
          </form>
        </div>
      )}
    </section>
  );
}
