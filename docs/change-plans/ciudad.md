# Ciudad — escenario nuevo

## Objetivo

Crear un escenario urbano más denso que Pueblo, con callejones, alcantarillas, calles de piedra y zonas residenciales/comerciales reconocibles.

## Configuración mínima propuesta

- `cityDensity`: densidad de parcelas ocupadas.
- `cityDistrictBalance`: proporción global configurable entre vivienda y comercio.
- `cityAlleys`: `none | few | many`.
- `citySewers`: interruptor para accesos visibles mediante el asset nuevo `sewer-entrance`; no genera todavía un mapa subterráneo.
- `cityWalls`: interruptor desactivado de forma predeterminada.
- `cityStreetWidth`: `narrow | standard | wide`.

## Generación

1. Crear arterias principales de piedra.
2. Dividir el espacio en manzanas.
3. Añadir callejones internos según configuración.
4. Asignar cada manzana a vivienda, comercio o espacio público.
5. Ocupar parcelas con assets de tamaño compatible.
6. Colocar accesos de alcantarilla en calles o callejones, nunca bajo edificios.
7. Garantizar conexión de calles transitables.

## Alcance inicial

Reutilizar primitivas y assets de Pueblo cuando sean adecuados. No crear simulación de interiores, tráfico, población ni red subterránea. Estas funciones no son necesarias para representar el mapa solicitado.

## Decisiones aprobadas

- Se creará el asset específico `sewer-entrance`.
- El usuario configura una proporción global residencial/comercial; no dibuja distritos manualmente.
- Las murallas forman parte de la primera versión como opción desactivada de forma predeterminada.

## Integración

Añadir `city` al modelo, selector, nombres, perfiles de iluminación, render y almacenamiento. Mantener `scenarios/city.ts` independiente.

## Evaluación

`npm run build` y revisión manual de densidad, zonificación y conectividad.
