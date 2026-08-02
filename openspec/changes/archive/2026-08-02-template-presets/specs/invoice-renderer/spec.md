## ADDED Requirements

### Requirement: La impresión conserva los fondos de color

El CSS del documento DEBE (MUST) pedir al navegador que respete los colores de fondo al imprimir.
Sin esa instrucción el navegador descarta los fondos por omisión, y un diseño cuya identidad son
sus barras y sus bloques de color se imprime en blanco.

La instrucción DEBE aplicarse únicamente en el contexto de impresión y NO DEBE (MUST NOT) cambiar
nada de lo que se ve en pantalla.

#### Scenario: El documento pide colores exactos al imprimir

- **WHEN** se genera el CSS de una página
- **THEN** contiene, dentro de una regla de impresión, la petición de ajuste de color exacto

#### Scenario: En pantalla no cambia nada

- **WHEN** se genera el CSS de una página
- **THEN** la petición de color exacto está dentro de `@media print` y no fuera

### Requirement: Las filas de detalle pueden alternar de color a través del tema

Cuando el tema del documento declara un token de relleno alterno además del token de relleno de
fila, el CSS del documento DEBE (MUST) hacer que las filas pares de la tabla de detalle resuelvan el
token de relleno al valor del alterno. Un bloque cuyo relleno referencia el token de fila alterna
así de color sin que ningún bloque guarde un literal ni exista una propiedad de fila par.

Si el tema NO declara el token alterno, el CSS NO DEBE (MUST NOT) emitir la regla: un documento sin
filas alternas no puede quedar con las pares sin relleno.

El alternado es de fila de detalle, no de página: NO DEBE afectar a la cabecera, a los totales ni al
pie.

#### Scenario: El tema declara el alterno

- **WHEN** se genera el CSS de un documento cuyo tema declara relleno de fila y relleno alterno
- **THEN** el CSS hace que en las filas pares el token de relleno resuelva al alterno

#### Scenario: El tema no declara el alterno

- **WHEN** se genera el CSS de un documento cuyo tema no declara relleno alterno
- **THEN** el CSS no contiene la regla de alternado

#### Scenario: Las filas alternan al renderizar

- **WHEN** se renderiza un documento con cuatro ítems, tema con relleno alterno y un bloque de la
  banda de detalle cuyo relleno referencia el token de fila
- **THEN** las filas primera y tercera pintan con el relleno de fila y la segunda y la cuarta con el
  alterno

### Requirement: Una fecha sin hora se interpreta en la zona local

Al formatear un valor de fecha, un texto con forma `YYYY-MM-DD` DEBE (MUST) interpretarse como
medianoche en la zona horaria local. Interpretado como UTC, que es lo que hace el constructor de
fecha por defecto con ese formato, la fecha se pinta un día antes en cualquier zona al oeste de
Greenwich.

Un valor de fecha que ya lleva hora o desplazamiento NO DEBE (MUST NOT) cambiar de interpretación.

#### Scenario: Fecha sin hora en zona al oeste de Greenwich

- **WHEN** se formatea el valor `"2020-12-12"` con formato de fecha en una zona horaria negativa
- **THEN** el texto resultante es el del 12 de diciembre, no el del 11

#### Scenario: Fecha con hora

- **WHEN** se formatea un valor de fecha que incluye hora
- **THEN** se interpreta tal cual, sin ajuste

#### Scenario: Valor que no es fecha

- **WHEN** se formatea con formato de fecha un texto que no es una fecha
- **THEN** se devuelve el texto original
