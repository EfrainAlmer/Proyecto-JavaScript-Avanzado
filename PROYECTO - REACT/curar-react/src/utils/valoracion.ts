export const valoracion = (n: number): string => (n === 0 ? 'Nuevo' : n >= 4.5 ? 'Excelente' : n >= 4 ? 'Muy buena' : 'Buena');
