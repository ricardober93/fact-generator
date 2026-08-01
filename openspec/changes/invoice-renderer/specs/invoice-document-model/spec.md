## MODIFIED Requirements

### Requirement: Estructura del documento

Un documento de factura DEBE (MUST) ser un valor serializable a JSON sin pérdida, compuesto
por la página, el tema, el schema de parámetros del embed, el contrato de datos
(`dataSchema`), el locale, la moneda y las bandas. No DEBE contener funciones, fechas
nativas, referencias circulares ni HTML.

`dataSchema`, `locale` y `currency` se incorporan con `invoice-renderer`: el motor necesita
saber qué datos exige el documento y cómo formatear sus importes, y ambas cosas son
propiedades del documento, no del código que lo pinta.

#### Scenario: Ida y vuelta por JSON

- **WHEN** se serializa un documento válido con `JSON.stringify` y se vuelve a parsear
- **THEN** el resultado es estructuralmente idéntico al original

#### Scenario: Documento vacío por defecto

- **WHEN** se llama a `emptyDocument()` sin argumentos
- **THEN** devuelve un documento válido, de página A4 vertical, con las cinco bandas
  presentes y sin ningún bloque

#### Scenario: El documento vacío trae el contrato de datos y el formato

- **WHEN** se llama a `emptyDocument()` sin argumentos
- **THEN** el documento resultante declara un `dataSchema` vacío, un `locale` y una
  `currency` por defecto, y es válido

#### Scenario: Un documento sin contrato de datos es inválido

- **WHEN** se valida un documento al que le falta `dataSchema`
- **THEN** la validación falla nombrando el campo ausente
