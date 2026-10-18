# Almacén

## Requisitos

- Mercancía organizada en estantes rectangulares de varias casillas.
- Estantes junto a muros o en filas interiores.
- Pasillos rectos y estrechos.
- Zonas con cajas, barriles y sacos actuales.
- Columnas estructurales.

## Generación propuesta

1. Reservar entrada, zona de carga y corredor principal.
2. Crear filas de estantes paralelas con ancho y separación constantes.
3. Alternar estantes llenos y vacíos según densidad.
4. Añadir estantes murales donde no haya ventanas o puertas.
5. Mantener corredores rectos conectados.
6. Colocar columnas en una retícula estructural que no cierre pasillos.
7. Usar objetos sueltos solo en zonas de carga y extremos de filas.

## Configuración mínima

- `warehouseFill`: volumen de mercancía.
- `warehouseShelfLayout`: `parallel | perimeter | mixed | random`.

## Assets

Los estantes lleno y vacío serán módulos de una casilla colocados consecutivamente. La generación compone filas rectangulares sin estirar el dibujo.

## Decisiones aprobadas

- Los estantes se construyen con módulos consecutivos de una casilla.
- El usuario puede elegir distribución paralela, perimetral, mixta o aleatoria.

## Evaluación

`npm run build` y revisión manual de conectividad y pasillos.
