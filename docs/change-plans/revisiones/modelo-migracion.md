# Revisión estática: modelo y migración

Alcance: `storage.ts`, `generate.ts`, `map-layers.ts` y sus consumidores inmediatos. Sin cambios de código ni ejecución de tests. `legacy_documentation` excluido. Líneas comprobadas al redactar; hay integración concurrente.

## Hallazgos pendientes

Ninguno de los hallazgos identificados permanece abierto tras revisar sus correcciones por lectura. Esto no equivale a verificación funcional.

## Hallazgos iniciales ya corregidos en el código consultado

- **P2, cantidad manual antigua de mazmorra:** corregido mediante modo legado visible en `main.ts:328–330,431–436,468–481,645–667`. `syncControls()` reconoce `roomCount > 0` con `dungeonRooms: null` sin marcar automático; muestra la cantidad anterior y deshabilita cuotas mientras sigue activo. `readConfig()` conserva `roomCount: legacyRoomCount ?? 0` y `dungeonRooms: null`. El usuario puede abandonar deliberadamente ese modo con el interruptor automático o el botón «Configurar por tamaños»; sus manejadores borran `legacyRoomCount`. El almacenamiento conserva la configuración antigua sin regenerar geometría. Cierre por revisión estática, sin tests ni ejecución.
- **P2, orientación de objetos:** corregido en `generate.ts:25–32` mediante rotación real horaria de 90°. Revisado por lectura: terreno destino `(x,y)` consulta origen `(y,w−1−x)`; objetos continuos usan `(w−y,x)` y ángulo `+π/2`; entrada discreta usa `(w−1−y,x)`; rectángulos usan `(w−y−alto,x,alto,ancho)`. Son transformaciones coherentes, aplicadas a planta baja y todas las adicionales. Sin ejecución ni revisión visual.
- **P2, metadatos de habitaciones:** `generate.ts:30` conserva `...r`; antes eliminaba `kind` y `beds` de `InnRoom` al transponer. Corrección observada por lectura, sin verificación funcional.
- **P2, booleanos en generación:** `generate.ts:19` ahora valida `water` y `landmarks`; antes valores como `"false"` llegaban al generador como verdaderos por coerción. Corrección observada por lectura.

## Sin hallazgo concreto

- La migración de `biome: building` a su bioma específico conserva terreno, objetos y capas; elimina el campo antiguo `buildingType`.
- `storage.ts` valida todas las plantas, limita conjuntamente sus objetos y comprueba el índice activo.
- `map-layers.ts` entrega referencias editables a la planta activa y construye una vista de render con terreno, objetos, entrada y habitaciones de esa planta, sin duplicar plantas adicionales.
- La rotación incluye todas las capas y conserva sus identificadores, elevaciones y metadatos de habitaciones. El problema anterior de orientación queda cerrado por revisión estática.
