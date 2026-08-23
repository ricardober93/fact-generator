# invoice-line-catalog Specification

## Purpose

TBD - created by archiving change catalog-source. Update Purpose after archive.

## Requirements

### Requirement: Una línea se puede elegir del catálogo o escribir a mano

Cuando haya un origen configurado, la lista de líneas DEBE (MUST) permitir buscar y elegir un
elemento, y rellenar con él las columnas que correspondan: descripción, precio unitario y, si la
plantilla lo declara, impuesto. Escribir la línea a mano DEBE seguir siendo posible siempre.

Una factura manual por un servicio no tiene por qué existir en ningún catálogo. El catálogo ahorra
tecleo; no decide qué se puede facturar.

#### Scenario: Elegir rellena la línea

- **WHEN** se elige un elemento del catálogo para una línea vacía
- **THEN** su descripción y su precio quedan puestos en la línea

#### Scenario: Lo rellenado se puede corregir

- **WHEN** se cambia a mano el precio de una línea que vino del catálogo
- **THEN** se guarda el valor escrito a mano

#### Scenario: Una línea a mano sigue siendo una línea

- **WHEN** se escribe una línea entera sin tocar el catálogo
- **THEN** se guarda igual que cualquier otra

### Requirement: La línea guarda la referencia además de su texto, nunca en su lugar

Una línea elegida del catálogo DEBE (MUST) guardar la referencia opaca de su origen **junto a** su
texto y su precio. NO DEBE (MUST NOT) guardarse la referencia en lugar de los valores.

Pintar un documento NO DEBE (MUST NOT) llamar nunca al origen. Un documento emitido que resolviera
sus líneas al leerlas cambiaría cuando cambie el catálogo y dejaría de pintarse cuando el catálogo
esté caído: exactamente lo que la congelación fue a evitar.

#### Scenario: El texto manda al pintar

- **WHEN** se pinta una factura cuyas líneas vinieron del catálogo
- **THEN** se pinta con lo guardado y no se hace ninguna llamada al origen

#### Scenario: Cambiar el catálogo no cambia lo emitido

- **WHEN** se emite una factura y después cambia en el catálogo el nombre y el precio de ese elemento
- **THEN** el documento emitido sigue mostrando lo que mostraba

#### Scenario: La referencia sobrevive al guardado

- **WHEN** se guarda una factura con una línea elegida del catálogo y se vuelve a abrir
- **THEN** la línea conserva su referencia

#### Scenario: Una referencia huérfana no rompe nada

- **WHEN** se abre una factura cuya línea referencia algo que el origen ya no conoce
- **THEN** la línea se ve y se imprime con lo que tiene guardado
