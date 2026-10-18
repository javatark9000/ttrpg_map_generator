# Revisión estática: herrería y taberna

Alcance: `src/engine/scenarios/smithy.ts`, `tavern.ts` y transposición de plantas en `src/engine/generate.ts`. Lectura y cálculo de límites, sin ejecutar mapas ni tests y sin modificar código. `legacy_documentation` excluida.

## Hallazgo

### Baja — El salón compacto desordenado puede perder su único banco — CORREGIDO

- **Ubicación:** `src/engine/scenarios/tavern.ts:112–120`.
- La mesa se desplaza y gira, pero el banco se coloca respecto de la posición original. Si sus huellas se cruzan, `furniture()` rechaza el banco y se ignora el resultado.
- **Caso geométrico 8×8:** la única mesa parte de `y = 4.625`, tamaño `1.05`. Con desplazamiento vertical `0.1` y giro `0.2` radianes, su borde inferior llega aproximadamente a `5.344`. El banco centrado en `5.525`, tamaño `0.55`, empieza en `5.25`: se rechaza por solapamiento. Esos desplazamientos están dentro de los rangos del generador; no se ha buscado una semilla concreta.
- **Impacto:** puede quedar una mesa sin ningún asiento. No se emiten objetos solapados ni se bloquea la generación; el banco es opcional en el código actual.
- **Corrección aplicada:** `tavern.ts` valida mesa y banco como conjunto antes de emitir cualquiera de los dos objetos o reservar sus huellas. Si el conjunto desplazado no cabe, reintenta el conjunto ordenado completo; nunca conserva una mesa descartando su asiento. La validación del grupo usa la misma regla local de colocación de ambos pisos, incluyendo colisiones entre sus piezas.
- **Garantía explícita:** el conteo del salón solo aumenta por conjuntos mesa+banco completos; si no cabe ninguno, la generación lanza un error descriptivo.
- **Evaluación de la corrección:** `npm run build` correcto. Sin tests, generación de mapas ni revisión visual; el caso 8×8 se comprobó por lectura geométrica.

## Sin bloqueos evidentes adicionales

- **Herrería (`smithy.ts:146–174`):** no se identificó un fallo obligatorio evidente en 8×8 para horno central o contra pared. Las franjas disponibles admiten el yunque compacto y las zonas de recepción/materiales. Esto no constituye verificación funcional exhaustiva.
- **Taberna:** el análisis del mínimo 8×8 no mostró imposibilidad de colocar barra, cocina, barriles, mesa o escaleras obligatorias. La planta superior reserva accesos a dormitorio y estudio (`tavern.ts:154–190`).
- **Formatos horizontales y capas:** `generate.ts:25–31` transpone terreno, objetos, entrada y habitaciones tanto de planta baja como de plantas adicionales.

La compilación integrada correcta fue comunicada por coordinación; esta revisión no ejecutó una nueva compilación ni sustituye la revisión visual.
