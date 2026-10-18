# Revisión estática: casa y posada

Alcance: `src/engine/scenarios/house.ts`, `house/layout.ts`, `inn.ts` y sus contratos de validación/transposición. Solo lectura del código; sin tests ni ejecución de mapas. `legacy_documentation` excluida. Este registro no sustituye una revisión visual.

## P2 — Casa compacta mínima: circulación inferior a una casilla

**Estado: corregido; comprobado por revisión estática y compilación. Sin ejecución de mapas ni revisión visual.**

- Referencias: `src/engine/scenarios/house/layout.ts:54–63`; `src/engine/scenarios/house.ts:33–55,101–108`.
- Caso deducido del código: 8 × 8, plantilla `compact`, un dormitorio, densidad 0.
- La sala-cocina tiene solo dos casillas de alto (`y=5..7`). Las reservas cubren umbrales y spawn, pero no una ruta completa entre entrada y dormitorio.
- El orden obligatorio de muebles coloca cocina en `(1.585,5.585)`, tamaño 1.05; chimenea en `(3.135,5.635)`, tamaño 1.15; mesa en `(5.585,5.585)`, tamaño 1.05.
- La huella cuadrada reservada para la mesa termina en `x=6.11`, `y=6.11`: quedan 0.89 casillas hacia los muros este/sur. No se conserva un corredor de una casilla desde el spawn `(4,6)` hasta la puerta del dormitorio `(6,4)` considerando dichas huellas.
- Es un riesgo de circulación visual/táctica, **no un error de conectividad del terreno**: los objetos siguen siendo decorativos y los SVG tienen margen transparente.
- Corrección aplicada: en `compact` con un dormitorio, la puerta del dormitorio se alinea con la entrada. Antes de amueblar se reserva una banda continua de una casilla desde esa puerta hasta el borde interior de la entrada; todas las huellas, incluidos muebles secundarios y alfombras, respetan esa reserva.
- En 8 × 8 la banda ocupa `x=4..5`, `y=4..7`, por lo que la mesa ya no estrecha el recorrido. Se mantienen el dormitorio solicitado, los tres muebles principales y sus escalas; no se reduce ninguna cuota. Las plantillas con dos dormitorios no se modifican por este hallazgo.

## P2 — Posada horizontal: pérdida de metadatos de habitaciones

**Estado: corregido en integración; comprobado por lectura del archivo actual.**

- Referencias: `src/engine/scenarios/inn.ts:8–10,127,154,210`; `src/engine/generate.ts:25–31`.
- La transposición de planos con `width > height * 1.5` reconstruía cada habitación exclusivamente con `x,y,w,h`, perdiendo `InnRoom.kind` y `beds` tanto en planta baja como superior. Ejemplo de formato afectado: 24 × 12.
- El código actual de `generate.ts:29` incluye `{ ...r, x: r.y, y: r.x, w: r.h, h: r.w }`, conservando esos campos. No requiere otra modificación por este hallazgo.

## Cuotas y plantas: sin otro fallo concreto identificado

- Posada (`inn.ts:26–79,189–211`): capacidad por banco `floor((guestHeight+1)/5)` coherente con habitaciones de altura mínima 4 y separadores de una casilla. La recepción no cuenta como habitación. Reparto equilibrado por bancos y `floor/ceil` entre plantas conserva la cuota exacta.
- Mínimos orientados: 8 × 11 sin planta adicional; 8 × 12 con escaleras. Con una habitación y segunda planta activada, el reparto 0 abajo / 1 arriba es consistente con el total solicitado.
- Escaleras (`inn.ts:163–168`) comparten posición entre plantas; el spawn superior queda en el rellano fuera de su huella y la recepción dispone de separación.
- Casa (`house/layout.ts:16–24,36–105`): las capacidades de `compact`, `corridor` y `courtyard` incluyen los separadores; el reparto de dormitorios mantiene al menos tres casillas en el eje subdividido. `random` elige únicamente plantillas capaces de alojar la cantidad solicitada.
- No se identificó por inspección otro fallo concreto de cuotas, límites o correspondencia de plantas. No implica validación dinámica ni visual.
