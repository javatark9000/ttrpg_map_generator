# Taberna

## Estructura obligatoria

- Salón.
- Barra de bebidas con espacio detrás para el cantinero.
- Cocina.
- Bodega.

## Configuración propuesta

- `tavernCondition`: `ordered | messy`.
- `tavernUpperStairs`: interruptor para colocar o no escaleras al segundo piso.

La barra debe separar físicamente atención y servicio. El modo desordenado representa las consecuencias de una pelea: muebles movidos y objetos caídos, sin bloquear la ruta entre entrada, barra y cocina. Las escaleras conectarán con una capa de segundo piso cuando dicha capa esté habilitada.

## Assets

Barra de bar, bebidas, cocina de leña, chimenea y `stairs-up`. Revisar si `counter` existente puede conservarse como mostrador genérico.

## Decisiones aprobadas

- “Desordenada” representa una pelea reciente.
- La presencia de escaleras al segundo piso es configurable.

## Evaluación

`npm run build` y revisión manual de circulación en ambos estados.
