# Montaña

## Requisitos

- Agua en posiciones variables.
- Entradas o salidas de cuevas.
- Camino opcional.
- Varias formas de camino seleccionables.

## Configuración propuesta

- `mountainPaths`: interruptor.
- `mountainPathLayout`: `pass | switchback | ridge | fork | random`.
- `mountainCaveEntrances`: cantidad entera, donde 0 desactiva las entradas.
- Mantener `water` como control de lagunas.

`random` elegirá un trazado mediante la semilla. Sin caminos, el terreno conservará zonas transitables naturales y conectadas, y el punto de entrada se elegirá en una de ellas.

## Generación

- Construir primero relieve y roca.
- Si hay camino, rasterizar el trazado elegido respetando la orientación del mapa.
- Elegir la laguna entre varios candidatos libres, no desde una coordenada fija.
- Colocar cuevas en límites entre roca y terreno transitable, orientadas hacia el espacio abierto.
- Añadir caminos de conexión únicamente si la configuración los permite; no convertirlos silenciosamente en grava visible.

## Decisiones aprobadas

- Las entradas de cueva son puntos independientes sin un destino representado.
- El usuario puede elegir cuántas entradas aparecen; la capacidad máxima se calcula según el tamaño y se valida explícitamente.

## Evaluación

`npm run build` y revisión manual de todos los trazados, sin camino y sin agua.
