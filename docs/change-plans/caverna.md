# Caverna

## Requisito

Permitir hendiduras o terreno vacío que represente una caída.

## Solución propuesta

- Añadir el terreno `void` como no transitable.
- Añadir `caveChasms` con modos `none | safe | dividing`: sin simas, simas con rodeo garantizado o simas capaces de dividir la cueva.
- Generar grietas después de conectar el suelo principal, sin cubrir el punto de entrada.
- Usar ruido y trazos alargados para distinguir una sima de una laguna.
- Volver a comprobar conectividad y conservar al menos una región transitable principal.
- Renderizar el vacío con profundidad oscura y borde rocoso; no reutilizar simplemente el color del agua.

## Decisiones aprobadas

- La capacidad de una sima para dividir la cueva será configurable.
- Los puentes naturales también serán configurables mediante `caveNaturalBridges`.
- En modo `safe`, siempre existirá un rodeo; en `dividing`, la separación es válida y explícita.

## Impacto compartido

`Terrain`, almacenamiento, pintor manual, muestras de terreno, render, transitabilidad e iluminación deben reconocer `void`.

## Evaluación

`npm run build` y revisión manual de legibilidad, entrada segura y exportación.
