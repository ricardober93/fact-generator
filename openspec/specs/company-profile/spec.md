# company-profile Specification

## Purpose

TBD - created by archiving change company-scoping. Update Purpose after archive.

## Requirements

### Requirement: La empresa emisora es una entidad, no un dato tecleado

DEBE (MUST) existir una empresa emisora con su NIT, su razón social, su dirección y su régimen. Sus
datos NO DEBEN (MUST NOT) escribirse documento a documento.

Mientras no exista ninguna, emitir DEBE rechazarse con un mensaje que diga que hay que crearla,
igual que ocurre cuando no hay rango de numeración.

#### Scenario: Sin empresa no se emite

- **WHEN** se intenta emitir un documento y no hay ninguna empresa
- **THEN** la emisión se rechaza diciendo que hay que crear la empresa, y el documento sigue siendo
  borrador

#### Scenario: La empresa se crea con sus datos

- **WHEN** se crea una empresa con NIT y razón social
- **THEN** queda guardada y disponible como emisora

#### Scenario: Una empresa sin NIT no se crea

- **WHEN** se intenta crear una empresa sin NIT o sin razón social
- **THEN** la creación falla y no queda nada guardado

### Requirement: Los datos del emisor los escribe el sistema en el documento

Al guardar un documento, el sistema DEBE (MUST) escribir los caminos de emisor que declara la
plantilla con los datos de la empresa. Esos caminos NO DEBEN (MUST NOT) ofrecerse como campos del
formulario.

Es el mismo mecanismo que el número: el dato lo decide el sistema, la plantilla lo sigue declarando y
lo sigue pintando, y lo que desaparece es la casilla donde alguien lo tecleaba.

#### Scenario: El emisor llega al papel sin tocar la plantilla

- **WHEN** se guarda un borrador sobre una plantilla que enlaza `emisor.nombre`
- **THEN** el documento se pinta con la razón social de la empresa

#### Scenario: El emisor no es un campo del formulario

- **WHEN** se abre el formulario sobre una plantilla que declara caminos de emisor
- **THEN** no aparece ninguna casilla para escribirlos

#### Scenario: Un borrador anterior adopta el emisor de la empresa

- **WHEN** se guarda un borrador que traía el emisor tecleado a mano
- **THEN** los caminos de emisor pasan a contener los datos de la empresa

### Requirement: Emitir congela el emisor

Al emitir, los datos del emisor DEBEN (MUST) quedar congelados con el resto del documento. Cambiar
después la empresa NO DEBE (MUST NOT) alterar ningún documento ya emitido.

Un documento entregado a un cliente tiene que poder reproducirse igual dentro de cinco años, y quien
lo emitió forma parte de lo que dice.

#### Scenario: Cambiar la razón social no reescribe la historia

- **WHEN** se emite un documento y después la empresa cambia de razón social
- **THEN** el documento emitido sigue mostrando la razón social con la que se emitió

#### Scenario: Los borradores sí adoptan el cambio

- **WHEN** cambia la razón social y después se guarda un borrador
- **THEN** el borrador pasa a mostrar la nueva

### Requirement: Quien crea una empresa pasa a pertenecer a ella

Crear una empresa DEBE (MUST) añadirla a las empresas de quien la crea, y esa empresa DEBE quedar
como su empresa activa.

Sin esto, un administrador podría crear una empresa a la que no puede entrar, y haría falta otro
administrador —o la base de datos— para arreglarlo.

#### Scenario: La empresa nueva queda activa

- **WHEN** un administrador crea una segunda empresa
- **THEN** pasa a pertenecer a las dos y opera en la nueva

#### Scenario: La primera empresa la adopta el administrador sembrado

- **WHEN** se arranca sin usuarios ni empresas y se crea la primera empresa
- **THEN** el administrador sembrado pertenece a ella y la tiene activa
