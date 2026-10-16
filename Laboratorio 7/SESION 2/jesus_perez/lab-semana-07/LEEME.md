# Panel de seguimiento académico (Lab 07 · Angular standalone)

## Requisitos
- Node.js 24 LTS (Angular 22 pide 22.22.3+ / 24.15+ / 26+) → `node --version`

## Pasos
1. Abre una terminal en esta carpeta (la que contiene package.json)
2. `npm install`        → instala Angular, Bootstrap, Vitest...
3. `npm start`          → servidor de desarrollo en http://localhost:4200 (Ctrl+C para detener)
4. `npm run build`      → compilación de producción en dist/panel-academico
5. `npm run test:ci`    → ejecuta las pruebas una sola vez
6. `npm run verify`     → build + pruebas

## Reto resuelto (nivel 1)
- Filtro "Destacados" (promedio >= 14) con aria-pressed
- Botón "Ordenar por promedio" con toSorted en un computed (no muta los datos iniciales)
- Una prueba automática por mejora (6 pruebas en total)

Nota: se agregó "lib": ["ES2023", "dom", "dom.iterable"] en tsconfig.json para poder usar toSorted.
