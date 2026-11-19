import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { AuthShell } from '../components/AuthShell';
import { Campo } from '../components/Campo';
import { useAuth } from '../context/AuthContext';
import { loginSchema, type LoginData, type LoginInput } from '../model/auth';
import { mensajeHttp } from '../services/mensajeHttp';

export function Login() {
  const auth = useAuth();
  const navigate = useNavigate();

  // react-hook-form es la única fuente de verdad: valores, errores y estado de envío.
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput, unknown, LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { dni: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Solo se ejecuta si el esquema aprobó los datos; `data` ya viene limpio (DNI sin espacios).
  async function entrar(data: LoginData): Promise<void> {
    try {
      const resultado = await auth.ingresar(data.dni, data.password);
      if (resultado === 'ok') void navigate(auth.inicio());
      else if (resultado === 'pendiente') void navigate('/verificar');
      else setError('root.server', { message: 'DNI o contraseña incorrectos.' });
    } catch (e) {
      setError('root.server', { message: mensajeHttp(e) });
    }
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit(entrar)} noValidate>
        <h1>Iniciar sesión</h1>
        <Campo label="DNI" error={errors.dni?.message}>{(a11y) => <input inputMode="numeric" maxLength={8} autoComplete="username" {...a11y} {...register('dni')} />}</Campo>
        <Campo label="Contraseña" error={errors.password?.message}>{(a11y) => <input type="password" autoComplete="current-password" {...a11y} {...register('password')} />}</Campo>
        <button className="btn brand" type="submit" disabled={isSubmitting} style={{ width: '100%', justifyContent: 'center' }}>
          {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="err" role="alert">{errors.root?.['server']?.message}</p>
        <p style={{ marginTop: 14, fontSize: 14 }}>¿No tienes cuenta? <Link to="/registro" className="link">Regístrate</Link></p>
      </form>
    </AuthShell>
  );
}
