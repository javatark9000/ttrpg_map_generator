# Casa

## Requisitos

Generar varias distribuciones de cocina, dormitorios, sala, entrada y combinaciones sala-cocina.

## Plantillas propuestas

- `compact`: sala-cocina común y uno o dos dormitorios.
- `corridor`: pasillo con estancias separadas.
- `courtyard`: estancias alrededor de un espacio central, solo en mapas amplios.
- `random`: elige una plantilla compatible mediante la semilla.

La interfaz permitirá seleccionar cualquiera de las plantillas o el modo aleatorio.

Cada plantilla define circulación y habitaciones obligatorias; densidad solo modifica muebles secundarios. La cantidad de dormitorios tendrá modo automático o una cantidad manual validada contra la plantilla y el tamaño. Cocina de leña y chimenea se colocan sobre un muro apto. Las ventanas se distribuyen después de fijar habitaciones y puertas.

## Decisiones aprobadas

- La plantilla se elige en la interfaz e incluye una opción aleatoria.
- Los dormitorios pueden calcularse automáticamente o configurarse manualmente.

## Evaluación

`npm run build` y revisión manual de cada plantilla en formatos pequeños y amplios.
