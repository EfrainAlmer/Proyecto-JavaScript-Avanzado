# Analizador académico (Lab 06 · Node.js + TypeScript)

## Requisitos
- Node.js 22 o superior (la guía pide 24 LTS) → comprueba con `node --version`

## Pasos
1. Abre una terminal en esta carpeta (la que contiene package.json)
2. `npm install`      → instala TypeScript y @types/node
3. `npm run build`    → compila src/ y genera dist/
4. `npm start`        → ejecuta dist/index.js
5. `npm test`         → corre las pruebas
6. `npm run verify`   → typecheck + build + test

## Opciones
npm start -- --estado riesgo
npm start -- --programa "Ingeniería de Software" --top 2
npm start -- --min-promedio 14 --orden nombre     (reto)
npm start -- --ayuda
