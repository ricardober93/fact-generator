# kernel

Lo que comparten los módulos. `ARCHITECTURE.md` descartaba una carpeta `shared/` porque «termina
siendo el cajón de sastre», y tenía razón sobre el resultado: una carpeta llamada «compartido» no
tiene criterio de entrada, así que todo lo que dos sitios usan cabe en esa palabra.

Esto es lo mismo con puerta.

## Para entrar hay que cumplir las cuatro

1. **No tiene significado de dominio.** Si no se puede explicar sin nombrar una factura, un rango o
   una empresa, no es kernel. `resolvePath` sí; `missingRequiredPaths`, que recibe un documento, no.
2. **Ya tiene dos consumidores.** Contados hoy, no «va a hacer falta».
3. **No tiene estado, ni IO, ni decoradores del framework.** Funciones puras y tipos. Es lo que
   permite que `render/` —que no puede importar la raíz del framework— importe de aquí sin romper el
   bundle del island.
4. **Su llegada borra código.** Si no elimina una duplicación que ya existe, no entra aunque cumpla
   las tres anteriores.

La cuarta se añadió al aplicar `modular-apps`: había un `outcome.ts` planificado para unificar los
cuatro resultados tipados de los repositorios. Cumplía las tres primeras y no borraba nada —los cuatro
tienen estados y cargas distintos—, así que habría sido una capa de genéricos sobre cuatro uniones que
solo comparten una convención. La convención se documenta; no necesita un tipo.

## Techo

Pasado un puñado de archivos, no se añade: se investiga qué módulo está goteando. Un kernel que crece
es el síntoma, no el problema.

## Lo que hay, y quién lo usa

|                 |                                                                                   |
| --------------- | --------------------------------------------------------------------------------- |
| `versionKey.ts` | clave de caché de vistas parametrizadas — facturas y plantillas                   |
| `paths.ts`      | acceso y escritura por camino — el motor de render, las entidades y el formulario |
| `cents.ts`      | enteros de céntimos — la aritmética del formulario y la comprobación al emitir    |

No reenvía nada del framework: `Money`, `Locker`, `CustomError` y `Password` se importan de
`@wabot-dev/framework` donde hagan falta.
