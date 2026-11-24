import { useState, type FormEvent } from 'react';

export function NamePractice() {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(name.trim().length >= 3
      ? `Recibido: ${name.trim()}` : 'Escribe al menos 3 caracteres.');
  }
  return (
    <form onSubmit={submit}>
      <label htmlFor="practice-name">Nombre</label>
      <input id="practice-name" value={name}
        onChange={(event) => setName(event.target.value)} />
      <button type="submit">Comprobar</button>
      <p role="status">{message}</p>
    </form>
  );
}
