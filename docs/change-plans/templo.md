# Templo

## Objetivo

Ofrecer plantas cultural y arquitectónicamente distintas sin reducirlas a una decoración sobre el mismo rectángulo.

## Arquetipos propuestos

- Basílica o templo romano.
- Mezquita con sala de oración y patio cuando haya espacio.
- Sinagoga con sala principal y áreas de estudio.
- Mandir con santuario y salas anexas.
- Pagoda con núcleo central y circulación perimetral.

Cada arquetipo requiere assets y reglas propias; los nombres no deben intercambiarse sobre una misma geometría genérica. Los cinco estilos forman parte del alcance aprobado inicial.

## Espacios opcionales documentados

Según el arquetipo: vestíbulo, sacristía o vestuario ritual, salas de estudio, almacén ceremonial, capillas laterales, patio, zona de ablución, habitaciones del clero y cámaras de servicio.

## Configuración propuesta

- `templeStyle` con los arquetipos aprobados.
- `templeMainHallOnly`.
- `templeSecretRooms`: interruptor sí/no.
- `templeTransition`: `none | upper | basement`.

## Gran salón y niveles

El gran salón siempre existe; `templeMainHallOnly` controla únicamente las estructuras anexas. Los pisos superiores y sótanos se almacenarán como capas del mismo proyecto. En un segundo piso, el área sobre el centro del gran salón quedará vacía.

## Assets

Techo de templo, altares/santuarios por estilo, elementos rituales, ventanas, estatuas, `stairs-up`, `stairs-down` y bancas alargadas con tamaño corregido a la cuadrícula.

## Decisiones aprobadas

- Se implementarán los cinco estilos: romano/basílica, mezquita, sinagoga, mandir y pagoda.
- Las habitaciones secretas se controlan con un interruptor.
- Segundo piso y sótano son capas del mismo proyecto.
- El gran salón es obligatorio; la opción decide si aparecen espacios anexos.

Aunque todos los estilos están aprobados, cada uno debe completarse con sus reglas y assets antes de pasar al siguiente; no se compartirá una geometría genérica solo para acelerar la entrega.

## Evaluación

`npm run build` y revisión arquitectónica/visual manual del estilo implementado.
