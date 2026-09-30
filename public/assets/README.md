# Assets de RC map generator

**47 objetos + 4 texturas por temática = 153 SVG**, de 128 × 128 unidades y fondo transparente.

- `vanilla/`: copia exacta de los 31 SVG originales de la primera versión, más 20 objetos originales de la ampliación.
- `dark/`: árboles retorcidos y parcialmente secos, hierro, madera agrietada, desgaste, reparaciones, grietas y tonos de ceniza. Cristales rosados oscuros y brasas cálidas.
- `anime/`: nuevas copas con sombreado por celdas, cerezos en flor, materiales luminosos, heráldica, pociones, ornamentos y cristales lilas. Fantasía isekai original de reinos, sin reproducir personajes de franquicias.

Los SVG de la raíz también se mantienen intactos para compatibilidad. La aplicación utiliza los subdirectorios temáticos; no recolorea los originales mediante filtros CSS.

## Regenerar

```bash
npm run assets
```

`scripts/create-assets.mjs` crea los originales; `scripts/create-expansion-assets.mjs` añade los 20 objetos de arquitectura, mobiliario y paisaje; `scripts/create-theme-assets.mjs` los copia a Vanilla y genera las variantes con colores, geometrías y detalles propios. Los resultados son deterministas y autocontenidos, sin referencias externas. Los efectos de desgaste Dark se recortan a la silueta del objeto para conservar su transparencia.

Para mantener cambios manuales, trasladarlos al script correspondiente antes de regenerar.

## Naturaleza — 14 objetos

| Archivo | Elemento |
| --- | --- |
| `tree-oak.svg` | Roble / árbol retorcido / copa isekai |
| `tree-pine.svg` | Conífera |
| `tree-gold.svg` | Árbol otoñal / árbol ceniciento / cerezo en flor |
| `bush.svg` | Arbusto, zarzas o arbusto floral |
| `rock.svg` | Rocas facetadas |
| `flowers.svg` | Flores silvestres, secas o luminosas |
| `mushrooms.svg` | Setas |
| `log.svg` | Tronco caído |
| `lilies.svg` | Nenúfares |
| `reeds.svg` | Juncos |
| `crystal.svg` | Cristales arcanos |
| `stalagmite.svg` | Formación rocosa |
| `rubble.svg` | Escombros de piedra |
| `cairn.svg` | Hito de montaña |

## Aventura — 18 objetos

| Archivo | Elemento |
| --- | --- |
| `chest.svg` | Cofre |
| `barrels.svg` | Barriles |
| `table.svg` | Mesa de aventurero |
| `books.svg` | Libros |
| `bones.svg` | Restos y calavera |
| `pillar.svg` | Columna |
| `campfire.svg` | Hoguera |
| `bedroll.svg` | Saco de dormir |
| `stairs.svg` | Escalera de piedra |
| `rug.svg` | Alfombra |
| `door.svg` | Puerta en planta |
| `bridge.svg` | Puente |
| `torch.svg` | Antorcha |
| `crates.svg` | Cajas |
| `altar.svg` | Altar arcano |
| `cart.svg` | Carreta |
| `sacks.svg` | Sacos |
| `tent.svg` | Tienda de campaña |

## Construcción — 15 objetos

| Archivo | Elemento |
| --- | --- |
| `broken-pillar.svg` | Columna rota |
| `archway.svg` | Arco derruido |
| `statue.svg` | Estatua |
| `roof-house.svg` | Tejado de casa |
| `roof-shop.svg` | Tejado de comercio |
| `well.svg` | Pozo |
| `market-stall.svg` | Puesto de mercado |
| `fence.svg` | Valla |
| `bed.svg` | Cama |
| `bench.svg` | Banco |
| `bookshelf.svg` | Estantería |
| `counter.svg` | Barra de taberna |
| `anvil.svg` | Yunque |
| `forge.svg` | Fragua de piedra |
| `weapon-rack.svg` | Armero |

Las variantes Dark añaden grietas, herrajes y reparaciones; Anime cambia los materiales e incorpora emblemas, bordes ornamentados y destellos. Los tejados son ilustraciones para vistas exteriores. La fragua no contiene una llama animada incrustada: el generador de herrerías combina la estructura con una hoguera pequeña, que utiliza el sistema de animación existente.

## Terreno — 4 texturas

`terrain-grass.svg`, `terrain-soil.svg`, `terrain-stone.svg` y `terrain-water.svg`. Cada temática tiene variantes transparentes repetibles para combinar con sus propias paletas procedurales.

Los terrenos madera, nieve y grava usan sus propias rampas de color y estas texturas compartidas. Las juntas de tablones, el relieve de los muros derruidos y los bordes rocosos de montaña se dibujan mediante Canvas; no requieren SVG de textura adicionales.

El renderizador añade sombras y halos de hogueras, antorchas, cristales y altares. Tamaños en casillas: `src/engine/types.ts`. Paletas, descripciones y rutas: `src/engine/themes.ts`.
