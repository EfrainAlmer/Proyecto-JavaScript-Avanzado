/** Marca de Curar: cruz en círculo + nombre. */
export function Cruz() {
  return (
    <span className="cross" aria-hidden="true">
      <svg viewBox="0 0 14 14">
        <path d="M5 0h4v5h5v4H9v5H5V9H0V5h5z" fill="var(--bg)" />
      </svg>
    </span>
  );
}
