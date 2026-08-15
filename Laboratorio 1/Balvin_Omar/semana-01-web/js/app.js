"use strict";

const botonConsejo = document.querySelector("#boton-consejo");
const consejo = document.querySelector("#consejo");

if (botonConsejo && consejo) {
  botonConsejo.addEventListener("click", () => {
    const seMostrara = consejo.hidden;
    consejo.hidden = !seMostrara;
    botonConsejo.setAttribute("aria-expanded", String(seMostrara));
    botonConsejo.textContent = seMostrara ? "Ocultar consejo" : "Mostrar consejo";
  });
}

// Reto: Alternar Tema
const botonTema = document.querySelector("#boton-tema");
if (botonTema) {
  botonTema.addEventListener("click", () => {
    const temaOscuroActivo = document.body.classList.toggle("tema-oscuro");
    botonTema.setAttribute("aria-pressed", String(temaOscuroActivo));
    botonTema.textContent = temaOscuroActivo ? "Tema claro" : "Tema oscuro";
  });
}
