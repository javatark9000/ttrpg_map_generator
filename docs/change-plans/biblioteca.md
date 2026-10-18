# Biblioteca

## Alcance actual aprobado

Biblioteca pasará a ser un escenario independiente, pero su rediseño se pospone para una fase posterior.

## Trabajo previsto ahora

- Extraer su rama actual a `scenarios/library.ts`.
- Registrar el escenario y migrar proyectos antiguos con `buildingType: "library"` sin regenerar su geometría guardada.
- Conservar su distribución, mobiliario y comportamiento actuales.
- Aplicar únicamente las reglas generales ya aprobadas de ventanas decorativas y escalas corregidas.

## Trabajo aplazado

No se definirán todavía nuevas salas, distribuciones de estanterías, opciones configurables ni assets exclusivos. Estos requisitos se documentarán cuando se retome el rediseño.

## Evaluación

Ejecutar `npm run build` y comparar manualmente un proyecto anterior antes y después de la migración.
