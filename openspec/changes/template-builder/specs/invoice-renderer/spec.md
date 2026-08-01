## MODIFIED Requirements

### Requirement: El pie se repite en cada página impresa

El bloque `pageFooter` DEBE (MUST) emitirse fijo respecto a la página **solo bajo `@media print`**,
que es el mecanismo por el que el navegador lo reproduce en cada hoja al imprimir. En pantalla el
pie DEBE (MUST) quedar en el flujo del documento, al final del mismo.

Al imprimir, el contenedor del pie DEBE (MUST) ocupar el ancho útil del documento y quedar
alineado con la columna del resto de las bandas; NO DEBE (MUST NOT) extenderse hasta los bordes
del papel.

La regla se emite en la hoja de estilo del documento, junto a la de `@page`, y no como estilo
en línea del contenedor: un `position: fixed` en línea se posicionaría respecto al viewport y
sacaría el pie del papel en cualquier superficie que embeba el documento, como el lienzo del
editor.

#### Scenario: El pie se emite una vez y en flujo en pantalla

- **WHEN** se renderiza un documento con bloques en `pageFooter`
- **THEN** aparece una sola vez en el marcado y su contenedor no lleva `position: fixed` en línea

#### Scenario: Al imprimir el pie se fija a la página

- **WHEN** se inspecciona la hoja de estilo que emite el documento
- **THEN** contiene, dentro de `@media print`, la regla que fija el contenedor del pie al pie de
  la página

#### Scenario: El pie impreso se alinea con la columna del documento

- **WHEN** se inspecciona la regla de impresión del pie de un documento cuya página tiene
  márgenes laterales
- **THEN** el ancho declarado es el ancho útil del documento, y no el ancho total del papel

## ADDED Requirements

### Requirement: El marcado identifica su banda y sus bloques

Cada contenedor de banda DEBE (MUST) emitir el nombre de su banda y cada contenedor de bloque el
identificador de su bloque, como atributos de datos del marcado. Es lo que permite a una
superficie de edición medir la geometría ya maquetada en vez de recalcularla.

Estos atributos NO DEBEN (MUST NOT) alterar la presentación del documento.

#### Scenario: La banda se identifica en el marcado

- **WHEN** se renderiza un documento con bloques en `header` y en `summary`
- **THEN** cada contenedor de banda lleva un atributo de datos con el nombre de su banda

#### Scenario: El bloque se identifica en el marcado

- **WHEN** se renderiza una banda con varios bloques
- **THEN** el contenedor de cada bloque lleva un atributo de datos con el identificador de ese
  bloque, distinto para cada uno
