# Pueblo

## Requisitos

- Casas, mercado, taberna, templo y ranchos.
- Corrales visibles.
- Densidad de edificios por cuadra.
- Cuadras de tamaños variables.

## Solución propuesta

- Separar el trazado vial de la ocupación de parcelas.
- Añadir `villageBlockSize`: `small | mixed | large`.
- Mantener `density` como porcentaje de parcelas ocupadas; no crear otro control equivalente.
- Añadir una distribución porcentual configurable del estatus de las viviendas.
- Crear un catálogo directo de edificios exteriores con tamaño mínimo, peso y asset de techo.
- Permitir elegir cuáles edificios singulares son obligatorios: mercado, taberna, templo y rancho. Sin selección explícita, se intentarán colocar según el espacio disponible.
- Generar corrales únicamente junto a ranchos y con acceso a una calle o sendero.
- En `mixed`, dividir los ejes con longitudes deterministas variables en lugar de una cuadrícula uniforme.

## Assets requeridos

Techos de taberna y templo, mercado, rancho, corral y casas de tamaños/estatus distintos.

## Decisiones aprobadas

- Mercado y plaza pueden compartir una misma parcela.
- El estatus de las viviendas se define mediante una distribución porcentual configurable.
- Los edificios singulares pueden marcarse individualmente como obligatorios; el comportamiento predeterminado depende del espacio disponible.

## Riesgo concreto

Los techos son decorativos y no bloquean navegación; cambiar esa regla implicaría un sistema distinto y no forma parte de este cambio.

## Evaluación

`npm run build` y revisión manual de ocupación baja/alta y cuadras mixtas.
