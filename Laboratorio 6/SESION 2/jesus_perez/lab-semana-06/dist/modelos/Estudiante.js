import { redondearDos } from "../utilidades/numeros.js";
export class Estudiante {
    codigo;
    nombre;
    programa;
    notas;
    constructor(datos) {
        this.codigo = datos.codigo;
        this.nombre = datos.nombre;
        this.programa = datos.programa;
        this.notas = [...datos.notas];
    }
    get promedio() {
        const suma = this.notas.reduce((total, nota) => total + nota, 0);
        return redondearDos(suma / this.notas.length);
    }
    get estado() {
        return this.promedio >= 12 ? "aprobado" : "riesgo";
    }
    toRow() {
        return {
            Código: this.codigo,
            Estudiante: this.nombre,
            Programa: this.programa,
            Notas: this.notas.join(" / "),
            Promedio: this.promedio.toFixed(2),
            Estado: this.estado === "aprobado" ? "Aprobado" : "En riesgo"
        };
    }
}
//# sourceMappingURL=Estudiante.js.map