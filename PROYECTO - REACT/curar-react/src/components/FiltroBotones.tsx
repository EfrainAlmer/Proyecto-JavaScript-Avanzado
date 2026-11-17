interface FiltroBotonesProps<T extends string> {
  readonly etiqueta: string;
  readonly opciones: readonly T[];
  readonly seleccionado: T;
  readonly onChange: (valor: T) => void;
  readonly texto?: (valor: T) => string;
  readonly estilo?: React.CSSProperties;
}

/** Grupo de botones con aria-pressed, usado por los filtros de varias páginas. */
export function FiltroBotones<T extends string>({ etiqueta, opciones, seleccionado, onChange, texto, estilo }: FiltroBotonesProps<T>) {
  return (
    <div role="group" aria-label={etiqueta} style={estilo ?? { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0' }}>
      {opciones.map((o) => (
        <button key={o} type="button" className={`btn${seleccionado === o ? '' : ' ghost'}`} aria-pressed={seleccionado === o} onClick={() => onChange(o)}>
          {texto ? texto(o) : o}
        </button>
      ))}
    </div>
  );
}
