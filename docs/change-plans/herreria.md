# Herrería

## Requisitos

- Mayor variedad de herramientas, armas, armaduras y piezas fundidas.
- Estantería y recepción de pedidos.
- Cantidad configurable de habitaciones.
- Dos disposiciones de horno: central o contra pared.

## Configuración propuesta

- `smithyForgeLayout`: `wall | central`.
- `smithyExtraRoomCount`: cantidad de habitaciones adicionales validada según dimensiones. Taller, recepción y almacén son zonas obligatorias y no entran en el conteo.

## Zonas

- Recepción/pedidos.
- Área de trabajo y horno.
- Almacén de materiales.
- Habitaciones adicionales solo si caben y fueron solicitadas.

La generación reserva circulación segura alrededor del horno y evita llenar el taller únicamente con yunques.

## Assets aprobados para la primera fase

Horno, herramientas de trabajo, armas y armaduras, piezas fundidas y estantería de recepción/pedidos. Cada identificador se añadirá solamente cuando exista su asset en las tres temáticas.

## Decisión aprobada

La cantidad configurable cuenta solo habitaciones adicionales; taller, recepción y almacén son obligatorios.

## Evaluación

`npm run build` y revisión visual de ambos tipos de horno.
