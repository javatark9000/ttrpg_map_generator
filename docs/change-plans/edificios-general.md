# Separación y reglas generales de edificios

## Cambio de modelo

Casa, Taberna, Posada, Herrería, Templo, Biblioteca, Almacén y Cuartel dejarán de ser variantes internas de `building` y pasarán a ser escenarios independientes con módulos propios.

### Migración aprobada

Al abrir un proyecto con `biome: "building"`, convertir `buildingType` a un identificador directo de bioma (`house`, `tavern`, `inn`, etc.) sin regenerar terreno ni objetos. El formato guardado nuevo ya no necesita `buildingType`.

## Reglas compartidas justificadas

Solo conservar como utilidades comunes:

- Creación de perímetro, suelo y entrada.
- Muros, puertas y ventanas.
- Colocación acotada de muebles.
- Rotación de planos muy horizontales.

Cada generador decide su distribución; no se creará un motor genérico de habitaciones.

## Ventanas

- Añadir ventanas sobre muros exteriores con separación configurable por el propio generador.
- No colocarlas sobre puertas, esquinas o muros interiores incompatibles.
- Serán estrictamente decorativas, sin efectos adicionales de iluminación, sombras o visibilidad.

## Escala de muebles

Revisar `ASSET_SIZES` tomando una casilla como 1,5 m. Las camas, bancas, barras, mesas y estanterías deben ocupar proporciones plausibles. El ajuste se hará por asset, no mediante un multiplicador global que distorsione objetos ya correctos.

## Niveles

Los edificios podrán contener varias plantas como **capas dentro del mismo proyecto**. El modelo deberá identificar la capa activa y conservar terreno, objetos, entrada y metadatos por planta. No se crearán proyectos separados.

## Evaluación

Solo `npm run build`; revisión visual manual por edificio y formato.
