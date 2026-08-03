## ADDED Requirements

### Requirement: Una vista parametrizada bajo navegación boosted declara su clave de versión

Toda vista con parámetros de ruta que pertenezca a un controlador con navegación boosted DEBE
(MUST) declarar una clave de versión. Sin ella, el sistema solo puede revalidar volviendo a
pintar la página entera para compararla, que es el trabajo que la caché existía para evitar.

La clave DEBE calcularse sin pintar la página.

#### Scenario: Toda vista parametrizada tiene clave

- **WHEN** se inspeccionan las vistas registradas de los controladores con navegación boosted
- **THEN** ninguna vista con parámetros de ruta carece de clave de versión

#### Scenario: El arranque no avisa de vistas sin clave

- **WHEN** arranca la aplicación
- **THEN** no se registra ningún aviso pidiendo una clave de versión para una vista

#### Scenario: La clave se obtiene sin pintar

- **WHEN** se pide la clave de versión de una vista
- **THEN** se obtiene sin renderizar el documento de la página

### Requirement: La clave recoge todo lo que la página pinta

La clave de versión DEBE (MUST) cambiar cuando cambie cualquier dato que acabe en el HTML de
esa página, venga de donde venga: de la entidad que nombra el parámetro de ruta, de las
entidades que esa referencia, o de las listas que alimentan sus selectores.

Esta es la garantía central: al declarar una clave, el sistema deja de comparar el contenido y
pasa a confiar en ella. Una clave que ignore una entrada NO DEBE (MUST NOT) existir, porque el
navegador se quedaría con una copia vieja sin nada que lo corrija después.

#### Scenario: Cambia la entidad principal

- **WHEN** se guardan datos distintos en la factura que se está viendo
- **THEN** la clave de su página cambia

#### Scenario: Cambia una entidad referenciada

- **WHEN** se edita el documento de la plantilla que usa una factura
- **THEN** la clave de la página de esa factura cambia

#### Scenario: Cambia una lista que alimenta un selector

- **WHEN** se crea una plantilla nueva, que pasa a ofrecerse en el selector de la factura
- **THEN** la clave de la página de la factura cambia

#### Scenario: Cambia el conjunto de imágenes disponibles

- **WHEN** se sube una imagen nueva, que pasa a ofrecerse en el editor de plantillas
- **THEN** la clave de la página del editor cambia

#### Scenario: No cambia nada

- **WHEN** se pide dos veces la clave de la misma página sin que nada haya cambiado entretanto
- **THEN** la clave es la misma las dos veces

### Requirement: Una clave equivocada solo puede errar hacia el lado barato

El cálculo de la clave DEBE (MUST) elegirse de forma que un error posible produzca trabajo de
más —volver a pintar una página que no había cambiado— y nunca contenido viejo en pantalla.

NO DEBE (MUST NOT) depender de que alguien recuerde incrementar un contador al escribir: esa
clase de olvido produce exactamente el error caro, y lo produce en silencio y semanas después
del cambio que lo causó.

#### Scenario: Contenido distinto, clave distinta

- **WHEN** dos estados de la misma página difieren en algo que se pinta
- **THEN** sus claves son distintas

#### Scenario: Una escritura futura no puede dejar la clave atrás

- **WHEN** se guarda por una ruta de escritura que no toca ningún contador de revisión
- **THEN** la clave refleja igualmente el contenido nuevo

### Requirement: La navegación boosted no muestra una página caducada

Volver a una página ya visitada mediante navegación boosted DEBE (MUST) mostrar el contenido
vigente. Si nada cambió, el sistema DEBE reutilizar lo que el navegador ya tenía y NO DEBE
volver a pintar la página en el servidor.

#### Scenario: Se vuelve a una página que no ha cambiado

- **WHEN** se navega de vuelta a una factura y nada ha cambiado desde la última visita
- **THEN** la respuesta indica que no hay cambios y no se pinta el documento de nuevo

#### Scenario: Se vuelve a una página que sí ha cambiado

- **WHEN** se navega de vuelta a una factura después de haberla guardado con datos distintos
- **THEN** la respuesta trae el contenido nuevo

#### Scenario: Una recarga completa siempre pinta

- **WHEN** se pide la página con una recarga completa en lugar de navegación boosted
- **THEN** se pinta el contenido vigente, sin depender de la clave
