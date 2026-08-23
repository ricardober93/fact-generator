## Context

`catalog-source` fijó cómo habla esta aplicación con otra por red: capacidades pensadas para quien
consume y no esquemas, referencias opacas, congelar lo que se enseña en vez de resolverlo al leer, e
integración por configuración. Dentro del proceso no rige ninguna de las cuatro.

Eso deja una asimetría incómoda: el mismo equipo aplica una disciplina estricta al hablar con una app
que no existe todavía, y ninguna al hablar entre carpetas que sí existen. Y como el escáner de wabot
recorre `src/` entero, cualquier módulo puede alcanzar el interior de otro sin que nada chirríe.

## Goals / Non-Goals

**Goals:**

- Que un módulo se pueda sacar a su propio despliegue sin rediseñarlo por dentro.
- Que lo compartido tenga una puerta con guardia, no una carpeta con nombre.
- Que las reglas de la frontera sean las mismas dentro y fuera del proceso.

**Non-Goals:**

- Sacar nada del proceso. Ni ahora ni en este cambio.
- Monorepo, paquetes, `package.json` por módulo, despliegues separados.
- Tocar `render/` o el registro de bloques.

## Decisions

### 1. Un módulo es una aplicación, y la prueba es quién importa qué

```
  src/<módulo>/
    app.ts                 la superficie: lo único que los demás pueden importar
    <X>Controller.tsx      rutas, si las tiene
    models/                entidades y repositorios          ← interior
    ui/                    páginas, componentes, islands     ← interior
    <Servicio>.ts          orquestación, si hace falta       ← interior
```

Un módulo puede importar `otro/app`. **No** puede importar `otro/models/...` ni `otro/ui/...`.

La definición no es una metáfora: un módulo es una aplicación **si y solo si** nadie importa su
interior, porque esa es exactamente la condición para poder sacarlo a otro proceso cambiando el
transporte y nada más. Mientras alguien alcance su interior, sacarlo es un rediseño.

_Alternativa descartada_: `package.json` por módulo con `exports`. La herramienta impondría la regla,
que es tentador, pero a cambio trae monorepo, instalación y build por paquete para un proyecto de un
proceso. Se paga cuando se extraiga de verdad, no antes.

_Consecuencia asumida_: la regla no la vigila nada. Es la misma situación que ya acepta ARCHITECTURE
para todo salvo la frontera isomorfa —que sí la impone el build—, y el proyecto descarta
explícitamente los tests de arquitectura. Se escribe para que se vea al revisar.

### 2. `app.ts` declara una superficie; no es un barril

Un barril reexporta el interior y no encapsula nada: por eso están prohibidos y siguen estándolo.
`app.ts` es lo contrario: enumera **lo poco** que se ofrece, y todo lo que no aparece es privado.

Para `numbering/` son dos cosas: el repositorio de rangos y el tipo de un rango consumible. Ni
`chooseRange`, ni la entidad completa, ni sus consultas internas.

### 3. Las cuatro reglas de frontera rigen también hacia dentro

Las que `catalog-source` escribió para la red:

1. **Se expone lo que el consumidor necesita, no el esquema propio.**
2. **Las referencias entre módulos son opacas**: se guardan y se devuelven, no se interpretan.
3. **Quien guarda un dato congela lo que enseña**, en vez de resolverlo al leer.
4. **Todo acoplamiento es explícito**: se declara en `app.ts` o no existe.

La primera aplicación práctica es la numeración: pasa de `docType: 'factura' | 'notaCredito'` a
`series: string`, una clave que no interpreta. Facturación decide que sus series se llaman `factura` y
`notaCredito`; numbering no lo sabe, y el día que haya remisiones no se entera.

_Consecuencia_: los mensajes de rechazo dejan de poder decir «no hay rango de **facturas**». Los
compone quien llama, que es quien sabe qué es una factura.

### 4. `src/kernel/`, y la regla de admisión que le faltaba a `shared/`

ARCHITECTURE §5 descartó `shared/` con un argumento correcto: «termina siendo el cajón de sastre». Este
cambio lo reabre porque el argumento describe **el resultado**, no la causa. La causa es que una
carpeta llamada «compartido» no tiene criterio de entrada: todo lo que dos sitios usan cabe en esa
palabra. La solución no es no tenerla; es ponerle puerta.

Entra en `kernel/` lo que cumple **las tres**:

1. **No tiene significado de dominio.** Si no se puede explicar sin nombrar una factura, un rango o
   una empresa, no es kernel.
2. **Ya tiene dos consumidores reales.** Dos, contados hoy. No «va a hacer falta».
3. **No tiene estado, ni IO, ni decoradores del framework.** Funciones puras y tipos.

Y un techo: pasado un puñado de archivos, no se añade nada más sin preguntarse qué módulo está
goteando. Un kernel que crece es el síntoma, no el problema.

Con esa puerta, hoy entra lo que ya está compartido —medido, no supuesto—:

|                                                 | consumidores hoy                      |
| ----------------------------------------------- | ------------------------------------- |
| `versionKey`                                    | 3 archivos                            |
| acceso por caminos (`resolvePath`, `writePath`) | 3 archivos, y hay una copia duplicada |
| aritmética de céntimos                          | 2 archivos                            |
| resultado tipado `{ status }`                   | 3 repositorios repiten la forma       |

Y no entra nada más. `Money`, `Locker`, `CustomError` y `Password` ya los da el framework: el kernel no
los reenvía.

_Consecuencia buena_: `writePath` deja de estar duplicado. Se documentó como duplicación deliberada
porque unificarla obligaba a `as unknown as` entre dos familias de tipos; en el kernel se escribe una
vez con la firma genérica, que es donde ese coste sí se paga una sola vez.

_Alternativa descartada_: seguir sin kernel y dejar que cada cosa viva donde nació. Es lo que hay hoy,
y ha producido una función duplicada y tres repositorios copiando la misma forma de resultado. La
regla «lo compartido vive donde nació» funciona hasta que nace en dos sitios a la vez.

### 5. La emisión es un servicio, y eso matiza §5 sin borrarla

`Issuance` recibe `InvoiceRepository`, `NumberRangeRepository` y `Locker`. `InvoiceRepository` vuelve a
crear, guardar, borrar y consultar.

§5 prohíbe «capa de servicios que reenvía al repositorio», y su razón —un controlador puede inyectar el
repositorio— sigue siendo cierta, así que la prohibición se queda. Lo que no contemplaba es coordinar
tres colaboradores y un bloqueo. Redacción nueva: **prohibido el que reenvía, permitido el que
orquesta varios agregados**, y la diferencia se ve en el constructor.

### 6. El controlador solo tiene rutas

DTO, clave de versión y ayudantes de error salen a archivos hermanos. Un controlador se lee para saber
qué rutas hay; sesenta líneas de validación antes de la primera lo impiden.

## Risks / Trade-offs

- **`kernel/` degenera igual que habría degenerado `shared/`** → Es el riesgo real y la regla de
  admisión es toda la defensa. Se hace visible en la revisión: cada archivo nuevo del kernel tiene que
  poder señalar sus dos consumidores. Si algún día no puede, el cajón ya se abrió.
- **La regla de no importar el interior no la impone nada** → Aceptado y consciente (decisión 1). El
  proyecto solo vigila con herramienta la frontera isomorfa, y descarta los tests de arquitectura.
- **`series: string` admite una errata** → Facturación mantiene su tipo cerrado y es la única que
  compone series. El error posible se queda del lado que sabe reconocerlo.
- **Mover archivos ensucia el historial** → Un commit por movimiento, sin mezclar contenido, para que
  `git log --follow` siga sirviendo.
- **Renombrar un escenario en un delta lo borra del spec** → Comprobado en seco dos veces en esta
  sesión: el archivador compara **nombres** de escenario y `validate --strict` no lo ve. Los títulos de
  requisito se renombran con `RENAMED`; los nombres de escenario no se tocan nunca.

## Migration Plan

Sin migración de datos: un rango con `docType` se lee como `series` con el mismo valor, con el truco de
siempre —valor por defecto en el getter—.

Orden: este cambio, después `company-scoping`, después `catalog-source`. Los dos nacen ya como módulos
con su `app.ts`.

## Open Questions

Ninguna.
