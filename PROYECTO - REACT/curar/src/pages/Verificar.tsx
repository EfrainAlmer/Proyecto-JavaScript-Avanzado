import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell';
import { CODIGO_DEMO, useAuth } from '../context/AuthContext';
import { useCarga } from '../hooks/useCarga';

export function Verificar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { cargando, error, setError, ejecutar } = useCarga();
  const [codigo, setCodigo] = useState('');
  const [aviso, setAviso] = useState('');
  const { pendiente } = auth;

  useEffect(() => {
    if (!pendiente()) void navigate('/login', { replace: true });
  }, [pendiente, navigate]);

  async function confirmar(evento: FormEvent): Promise<void> {
    evento.preventDefault();
    setError('');
    if (!/^\d{6}$/u.test(codigo)) {
      setError('El código tiene 6 dígitos.');
      return;
    }
    const r = await ejecutar(auth.verificar(codigo));
    if (!r.ok) return;
    if (r.valor) void navigate(auth.inicio());
    else setError('Código incorrecto.');
  }

  return (
    <AuthShell>
      <form onSubmit={(e) => void confirmar(e)} noValidate>
        <h1 style={{ fontSize: 24, fontWeight: 400 }}>Verifica tu correo</h1>
        <p style={{ color: 'var(--slate-text)', marginBottom: 14 }}>Escribe el código de 6 dígitos. <b>Modo demostración:</b> el código es {CODIGO_DEMO}.</p>
        <label>Código de verificación
          <input value={codigo} onChange={(e) => setCodigo(e.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
        </label>
        <p className="err" role="alert">{error}</p>
        <button className="btn brand" type="submit" disabled={cargando} style={{ width: '100%', justifyContent: 'center' }}>{cargando ? 'Verificando…' : 'Verificar'}</button>
        <button className="link" type="button" onClick={() => setAviso('Código reenviado (simulado).')}>Reenviar código</button>
        <p role="status" aria-live="polite">{aviso}</p>
      </form>
    </AuthShell>
  );
}
