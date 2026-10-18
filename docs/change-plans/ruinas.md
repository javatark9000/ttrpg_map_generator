# Ruinas

## Requisitos configurables

- Entradas o salidas de pasadizos secretos.
- Estatuas completas e incompletas.
- Agua en una posición variable.
- Plazas, escaleras y vestigios de niveles superiores.
- Distribuciones distintas de la matriz regular actual.

## Configuración propuesta

- `ruinLayout`: `grid | courtyard | scattered | random`.
- `ruinFeatures`: `simple | standard | monumental`, para controlar plazas, estatuas y escaleras.
- `ruinSecretPassages`: interruptor. Los accesos serán decorativos y no dibujarán ni enlazarán un corredor secreto.
- El agua conserva el interruptor general y obtiene centro, forma y borde a partir de la semilla.

`random` elegirá uno de los trazados mediante la semilla; no será un algoritmo adicional.

## Generación

1. Crear sitios según el trazado.
2. Reservar plazas o patios antes de colocar recintos.
3. Deteriorar estructuras.
4. Colocar agua en una zona libre elegida entre candidatos válidos.
5. Añadir estatuas y transiciones de nivel.
6. Colocar accesos secretos sobre muros que conecten dos zonas útiles.
7. Garantizar conectividad del terreno normal.

## Decisiones aprobadas

- En Ruinas, las escaleras y vestigios de segundo piso serán únicamente señales visuales.
- Los pasadizos secretos se representarán mediante entradas o salidas decorativas independientes.

## Evaluación

`npm run build` y revisión manual de cada trazado, semilla y nivel de elementos.
