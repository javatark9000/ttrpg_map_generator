# Revisión estática: UI, capas y temas individuales

Alcance: fuentes actuales de `main.ts`, `viewport.ts`, render, animación y exportación; comprobación auxiliar de helpers de plantas y guardado. Sin editar código, ejecutar mapas ni tests. `legacy_documentation` excluida. Las líneas corresponden a la lectura de esta revisión; hay edición concurrente.

## Cierre del hallazgo de exportación

- **P2 resuelto — Desincronización de planta entre miniatura y descarga.** Verificado únicamente por lectura de la fuente actual: `src/main.ts:784–796` conserva `exportSnapshot` y abre el modal antes del primer `await` (`:802`). Etiqueta y metadatos usan ese snapshot; la actualización de cuadrícula también (`:823–828`). La descarga clona `exportSnapshot` (`:845`) y deriva de él nombre, planta, temática y dimensiones. El cierre invalida el snapshot (`:777`), y el callback de la miniatura comprueba su identidad (`:803`). Cerrado el hallazgo conocido; sin ampliar alcance ni ejecutar tests o mapas.

No quedan hallazgos abiertos de esta revisión.

## Hallazgo anterior ya corregido

- **P2 resuelto — Cambio de tema no marcaba el proyecto como editado.** La fuente actual en `src/main.ts:617` ya asigna `edited = true` al modificar `map.config.theme`. No requiere otra corrección. La revisión anterior señalaba la pérdida de confirmación de reemplazo en un mapa recién generado cuyo único cambio fuera el tema.

## Rutas coherentes revisadas

- Pintar, borrar y colocar usan `activeLayerData`; historial y guardado conservan el proyecto completo.
- `src/engine/render.ts:96` y `src/engine/animation.ts:15,23` resuelven la planta activa; GIF usa `createAnimatedScene` y PNG/JPEG usan `renderMap`.
- `src/viewport.ts:113`, `src/engine/render.ts:228` y `src/engine/animation.ts:41` resuelven el tema del objeto. Cachés, sprites y halos animados distinguen temas.
- No se detectó pérdida directa de plantas ni sustitución incorrecta del tema individual en esas rutas. Esto no sustituye una revisión visual.
