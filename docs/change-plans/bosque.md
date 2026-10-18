# Bosque

## Requisitos

- Variar o configurar la orientación del río.
- Permitir bosques sin caminos.

## Estado actual

La opción `forestPaths` ya permite generar el bosque sin caminos. El trabajo necesario es hacerla más visible y comprobar que puentes y despejes dependan exclusivamente de caminos existentes.

## Río

Añadir `forestRiverDirection` con opciones simples:

- `none`
- `random`
- `north-south`
- `east-west`
- `diagonal-nw-se`
- `diagonal-ne-sw`

`random` debe elegir de forma determinista usando la semilla. La geometría se calculará en coordenadas del mapa; no se rotará una imagen terminada.

### Decisión aprobada

El selector incluirá `none`, aunque el interruptor general de agua también elimine el río. En la interfaz deberá evitarse una contradicción: si el agua está desactivada, la orientación queda inactiva sin perder su valor.

## Archivos previstos

- `src/engine/types.ts`
- `src/engine/scenario-options.ts`
- `src/engine/scenarios/forest.ts`
- `src/main.ts`
- `src/engine/storage.ts`

## Evaluación

`npm run build` y revisión manual de orientaciones en mapas horizontales, verticales y sin caminos.
