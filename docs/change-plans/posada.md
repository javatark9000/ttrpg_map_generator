# Posada

## Requisitos

- Elegir cantidad de habitaciones.
- Incluir recepción.
- Escaleras opcionales hacia un segundo piso.

## Solución propuesta

- `innRoomCount`: entero validado contra la capacidad del mapa.
- `innUpperStairs`: interruptor.
- Reservar primero entrada, recepción y corredor; dividir después el espacio restante en habitaciones.
- Cada habitación debe tener acceso al corredor y mobiliario mínimo.
- Mezclar habitaciones individuales, dobles y familiares dentro del total solicitado.
- Rechazar explícitamente cantidades imposibles, sin reducirlas silenciosamente.

Si se habilitan, las escaleras conectarán con una capa de segundo piso del mismo proyecto.

## Assets

Recepción de posada, ventana y `stairs-up`.

## Decisiones aprobadas

- Se permiten habitaciones individuales, dobles y familiares.
- `innRoomCount` cuenta únicamente habitaciones para huéspedes; recepción y servicios no forman parte de ese total.

## Evaluación

`npm run build` y revisión manual de capacidad mínima y máxima.
