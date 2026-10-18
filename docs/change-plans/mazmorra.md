# Mazmorra

## Requisito

Configurar cantidades separadas de habitaciones pequeñas, medianas y grandes.

## Decisiones aprobadas

- El tamaño se mide por la cantidad de casillas del **lado interior más corto**.
- Las cantidades por categoría reemplazan `roomCount` en modo manual.
- Rangos sin solapamientos:
  - Pequeña: 4–8 casillas.
  - Mediana: 9–12 casillas.
  - Grande: 13 o más casillas.

## Solución propuesta

- Reemplazar la cantidad exacta única por `dungeonRooms: { small, medium, large }` cuando el modo automático esté desactivado.
- Calcular capacidad antes de generar y rechazar explícitamente combinaciones imposibles.
- Asignar cuotas a hojas BSP según el espacio que realmente puedan alojar.
- No degradar una habitación grande a mediana ni reducir cantidades silenciosamente.
- Mantener migración para proyectos con `roomCount`: tratarlos como configuración anterior sin modificar su geometría guardada.

## Riesgo concreto

La capacidad no depende solo del área total; también depende de la relación de aspecto, el lado corto mínimo y la separación entre habitaciones.

## Archivos previstos

`types.ts`, `scenario-options.ts`, `storage.ts`, `main.ts`, `scenarios/dungeon.ts` y `scenarios/dungeon-rooms.ts`.

## Evaluación

Solo `npm run build`; revisión manual de validación y conteos generados.
