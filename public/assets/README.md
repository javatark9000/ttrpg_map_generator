# Ilustraciones de Astra

Assets SVG originales de **128 × 128 unidades**, con fondo transparente, gradientes y detalles vectoriales. Se usan en el lienzo, la biblioteca de objetos y las exportaciones; no se descargan de servicios externos.

Para regenerarlos de forma determinista:

```bash
npm run assets
```

El código fuente de dibujo está en `scripts/create-assets.mjs`. Para conservar cambios manuales en los SVG, trasladarlos también al script antes de regenerar.

## Naturaleza — 12 objetos

| Archivo | Elemento |
| --- | --- |
| `tree-oak.svg` | Roble verde de copa lobulada |
| `tree-pine.svg` | Copa de conífera verde azulada |
| `tree-gold.svg` | Árbol de hojas doradas |
| `bush.svg` | Arbusto con pequeñas bayas |
| `rock.svg` | Grupo de rocas facetadas |
| `flowers.svg` | Flores silvestres |
| `mushrooms.svg` | Setas rojizas |
| `log.svg` | Tronco caído con anillos y musgo |
| `lilies.svg` | Nenúfares y flor acuática |
| `reeds.svg` | Juncos de ribera |
| `crystal.svg` | Cristales de color jade |
| `stalagmite.svg` | Formación rocosa puntiaguda |

## Aventura — 15 objetos

| Archivo | Elemento |
| --- | --- |
| `chest.svg` | Cofre de madera y herrajes |
| `barrels.svg` | Grupo de barriles |
| `table.svg` | Mesa con pergamino y vaso |
| `books.svg` | Libros encuadernados |
| `bones.svg` | Calavera y huesos |
| `pillar.svg` | Columna sobre pedestal |
| `campfire.svg` | Hoguera con aro de piedras |
| `bedroll.svg` | Saco de dormir |
| `stairs.svg` | Escalera de piedra |
| `rug.svg` | Alfombra con motivo geométrico |
| `door.svg` | Puerta de madera en planta |
| `bridge.svg` | Puente de tablones y cuerdas |
| `torch.svg` | Antorcha con soporte |
| `crates.svg` | Cajas de madera reforzada |
| `altar.svg` | Altar con símbolo arcano y velas |

## Terreno — 4 texturas

`terrain-grass.svg`, `terrain-soil.svg`, `terrain-stone.svg` y `terrain-water.svg` son texturas transparentes repetibles. El renderizador las rasteriza y combina con campos de color, ruido fractal y contornos procedurales.

Las sombras y el halo de antorchas, hogueras, altares y cristales se añaden mediante Canvas 2D. El tamaño en casillas de cada objeto se define en `src/engine/types.ts`.
