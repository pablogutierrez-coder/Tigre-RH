# Firebase Structure

## Colecciones

La capa Firebase queda preparada con estas colecciones:

- `users`
- `campaigns`
- `sessions`
- `participants`
- `attendance`
- `confirmations`
- `reopens`
- `logs`
- `surveys`
- `responses`
- `file_records`
- `training_closures`
- `app_settings`

## Nombres Compatibles

Se mantienen los nombres actuales de la app para evitar romper relaciones existentes: `sessions`, `participants`, `attendance`, `confirmations`, `reopens`, `logs`, `surveys` y `responses`.

No se introducen nombres nuevos como `trainings` o `training_sessions` porque el modelo actual usa `sessions` y campos como `training_session_id`.

## Build

```bash
npm run build
```

## Seed Inicial

```bash
npm run seed:firebase
```

El seed lee las variables Firebase desde `.env.local` y escribe documentos con los IDs actuales.

## Datos Migrados

El seed migra datos desde `src/db/initialData.ts`:

- `INITIAL_USERS`
- `INITIAL_CAMPAIGNS`
- `INITIAL_SESSIONS`
- `INITIAL_PARTICIPANTS`
- `INITIAL_ATTENDANCE`
- `INITIAL_CONFIRMATIONS`
- `INITIAL_REOPEN_REQUESTS`
- `INITIAL_AUDIT_LOGS`
- `INITIAL_SURVEYS`
- `INITIAL_RESPONSES`

Tambien crea documentos base en `app_settings` para estados de asistencia, resultado de formacion, roles y estados de capacitacion.

## Datos No Migrados

No se migran passwords de usuarios. Si los usuarios demo traen `password`, el seed y el servicio de usuarios lo excluyen antes de guardar en Firestore.

## Reglas De Negocio

- La asistencia inicial de nuevos registros es `Seleccionar`.
- `Seleccionar` y `Pendiente` son estados neutros.
- `Seleccionar` y `Pendiente` no cuentan para KPIs.
- El cierre requiere asistencia completa.
- El cierre requiere resultado `Apto` o `No apto`.
- El cierre requiere encuesta respondida cuando exista encuesta asociada habilitada o cerrada.
- El cierre registra auditoria.
- Las confirmaciones usan borrado logico.
- Los logs no se editan ni eliminan desde cliente.
- Los documentos de cierre no se editan ni eliminan despues de creados.

## Pendiente Para La Siguiente Fase

- Conectar login con Firebase Auth.
- Migrar `src/App.tsx` de `localStorage` a Firestore por modulos.
- Reemplazar guardado local por servicios Firebase.
- Activar reglas estrictas cuando Auth este conectado.
- Ajustar custom claims de Firebase Auth para `request.auth.token.role`.
