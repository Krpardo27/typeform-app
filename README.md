This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Typeform Responses Flow

La navegación desde las tarjetas y el buscador abre directamente las respuestas. La antigua ruta de detalle del formulario solo redirige tras validar acceso y pertenencia; ya no muestra una página intermedia de integración. Copiar ID/src/iframe y duplicar siguen disponibles desde las tarjetas. El selector de bases inicia el mismo diálogo de duplicación, sin pasar por el detalle retirado.

Este proyecto consume respuestas de Typeform usando el endpoint oficial de responses:

- Retrieve responses: https://www.typeform.com/developers/responses/reference/retrieve-responses/

Implementacion actual en el codigo:

- Servicio: `getTypeformFormResponses` en `src/features/typeform/services/typeform.service.ts`
- Endpoint usado: `/forms/{formId}/responses?page=...&page_size=...`

Notas del flujo de ganadores:

- Se puede seleccionar uno o mas ganadores desde la vista de participantes.
- Al confirmar correctamente, las filas muestran «Ganador guardado» inmediatamente, sin esperar otra carga. La ordenación de TanStack coloca primero a los ganadores confirmados, mantiene el orden original dentro de cada grupo y conserva los números de participante. Editar casillas sin guardar no cambia esa condición; cerrar o finalizar una consulta tampoco retira ganadores. Al cambiar el grupo confirmado, la lista vuelve al inicio para mostrarlo.
- Los editores y superadministradores reciben identidad enmascarada desde el servidor, también para ganadores guardados: nombre con prefijo máximo de dos caracteres + `****` y correo con prefijo local máximo de tres + `*****` sin dominio. Los valores muy cortos nunca se muestran completos. Región y ciudad/comuna se muestran sin máscara.
- La tabla muestra únicamente selección, número de participante, región, comuna y acciones. Nombre y email no se renderizan en celdas ni etiquetas accesibles; el modal y las exportaciones conservan sus datos y permisos. Los estados de ganador y respuesta ausente aparecen junto al número. Se puede ordenar por número, región o comuna dentro de cada grupo, manteniendo los ganadores primero.
- La región general para filtros y tabla se normaliza contra un catálogo cerrado de regiones chilenas; las desconocidas se omiten, sin enviar texto libre. No se envían otras respuestas crudas, hidden, fechas ni contactos persistidos en las props de candidatos.
- Los datos completos SOLO se consultan para ganadores confirmados, mediante flujo explícito con permiso temporal válido y auditoría. `readParticipantDataAction` conserva su firma como wrapper de `readWinnerDataAction`, sin acceso alternativo a candidatos ni montaje en la página.
- Los usuarios sin permisos de edición no reciben esos perfiles ni pueden consultar detalles.
- Los ganadores quedan persistidos. Consultarlos no cambia su fecha, responsable ni motivo; cerrar el modal tampoco modifica la selección.
- La consulta y exportación de ganadores usan un permiso temporal de dos minutos, renovable mediante «Consultar ganadores guardados» sin reconfirmar. Cerrar el detalle conserva ese permiso; «Finalizar consulta», caducidad y cambios confirmados lo revocan.
- La revisión opaca de los ganadores guardados invalida inmediatamente una consulta anterior al recibir una selección incompatible, incluso con los mismos tokens y nueva fecha de selección. La revalidación del guardado propio conserva el permiso y su vencimiento original.
- Las respuestas ausentes de ganadores guardados se muestran como no disponibles, sin borrar ganadores automáticamente. Pueden retirarse explícitamente; no participan en nuevos sorteos ni habilitan datos completos. Para guardar cambios deben retirarse los ausentes de la selección.
- «Abrir formulario» también está disponible cuando no hay participantes. El guardado verifica sesión y permisos vigentes después de las consultas remotas y dentro de la transacción, sin heredar un rol cacheado cuando falta la membresía.
- El filtro regional y la búsqueda acotan la tabla y el sorteo, conservando la selección manual fuera del filtro.
- «Ver Datos» ocupa la última columna: solo habilita la consulta de ganadores confirmados. Para un ganador guardado inicia explícitamente un permiso y abre ese participante, sin volver a guardar la selección. Las etiquetas del modal usan el nombre legible del campo real, nunca su ID ni una ref opaca.
- Se registra auditoria para `WINNER_SELECTED` y `SENSITIVE_DATA_VIEWED`; cada lectura sensible conserva el usuario responsable, token ganador consultado y motivo autorizado de la selección persistida.
- La auditoría de lectura y exportación sensible es obligatoria: si no se puede persistir el evento, no se entregan los datos completos. El resto de eventos conserva el comportamiento best-effort existente.

### Exportación CSV y Excel

- Ambos ámbitos incluyen siempre `participant_number`, `token`, `submitted_at`, `contact`, `selected_at` y `winner_reason`, seguidos de las preguntas reales del formulario. No se agregan columnas artificiales de nombre/correo ni Instagram: esta última solo aparece si existe como campo. Se conservan preguntas sin respuesta, subcampos anidados y títulos duplicados en columnas independientes con sufijos legibles; nunca se usan IDs opacos como cabeceras.
- Participantes: nombre/apellidos con prefijo máximo de dos caracteres y `****`; correo con prefijo local máximo de tres y `*****`, sin dominio. RUT, teléfono, texto libre y demás respuestas personales se enmascaran conservadoramente. `contact` proviene exclusivamente de respuestas enmascaradas, nunca del ganador persistido ni de hidden. `selected_at` y `winner_reason` quedan vacíos, incluso si hay un permiso activo.
- `submitted_at` conserva la fecha real de envío; regiones chilenas conocidas y ciudad/comuna quedan visibles solo en campos de ubicación del esquema real. Las regiones desconocidas, refs inyectadas y campos hidden no habilitan esta excepción. En la tabla también son visibles región y comuna, pero no las fechas.
- Ganadores: respuestas completas únicamente para tokens persistidos incluidos en un permiso explícito vigente, con auditoría del usuario y los motivos. Hidden nunca se exporta, tampoco como contacto de respaldo.
- Se cargan todas las páginas antes de generar el archivo; una carga incompleta falla sin descargar un subconjunto. La numeración se calcula sobre el concurso completo con el orden cronológico de la tabla, no se reinicia al exportar ganadores. Todas las descargas y errores usan `Cache-Control: private, no-store`.
- Si falta la respuesta de un ganador autorizado, la exportación devuelve un conflicto sin archivo parcial. En CSV se neutralizan valores y cabeceras interpretables como fórmulas; XLSX conserva esos valores como cadenas literales.

### Pruebas locales de volumen

- El generador de fixtures consulta únicamente el esquema del formulario y crea respuestas sintéticas locales, sin enviar participaciones a Typeform ni escribir en la base de datos. Admite entre 1 y 5000 participantes; exige `--force` para reemplazar un fixture existente.
- La prueba de `mqUO6e4B` contiene 250 participantes ficticios, correos únicos `@example.invalid` y ubicaciones de las 16 regiones. Se usan los IDs y tipos de los campos reales, no campos inventados.
- La configuración local ignorada por Git activa `TYPEFORM_RESPONSES_SOURCE=fixture` y limita `TYPEFORM_FIXTURE_FORM_IDS=mqUO6e4B`. Los demás formularios siguen usando la API. En producción siempre se ignoran los fixtures, aunque esas variables estén definidas.
- Este modo sustituye la visualización local de respuestas; no mezcla ficticios y reales. Una indicación visible identifica la prueba, y permite búsqueda, filtros, selección y sorteo local. El guardado y la consulta de ganadores reales se bloquean también en servidor, no solo en la interfaz.
- Para volver a respuestas reales, cambiar `TYPEFORM_RESPONSES_SOURCE` a `api` en la configuración local de desarrollo y reiniciar el servidor. No es necesario borrar respuestas ni ganadores reales.
