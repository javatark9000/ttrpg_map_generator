# Cuartel

## Requisitos

- Elegir la orientación de literas.
- Añadir morrales, armas y objetos militares.
- Configurar el volumen de contenido.
- Usar camas con aspecto de barraca.

## Configuración propuesta

- `barracksBedLayout`: `walls | perpendicular | rows | random`.
- `barracksContents`: control exclusivo del volumen de muebles, armas y equipo.

## Generación

- Reservar entrada, pasillo y armería.
- Colocar literas según el trazado elegido con separación transitable.
- Distribuir morrales cerca de camas y armas sueltas en zonas designadas. Los armeros existentes serán reemplazados en este escenario.
- Mantener una mesa o zona de oficiales cuando el tamaño lo permita.

## Assets

Cama/litera de barraca, morral, lanzas y espadas. En Cuartel, las armas sueltas reemplazan los armeros existentes.

## Decisiones aprobadas

- `random` elige una orientación coherente mediante la semilla; no mezcla disposiciones.
- El volumen de contenido tiene un control exclusivo.
- Las armas individuales reemplazan los armeros en este escenario.

## Evaluación

`npm run build` y revisión manual de los tres trazados y densidades.
