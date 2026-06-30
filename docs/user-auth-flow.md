# Flujo De Autenticacion Por Usuario

## Decision Tecnica

La plataforma FDR inicia sesion con `usuario` y `contrasena`. No se usa correo real, correo tecnico ni Email/Password de Firebase Authentication.

Firebase Authentication se usa solo como sistema de sesion mediante Custom Tokens generados desde Cloud Functions con Firebase Admin SDK.

## Flujo De Login

1. El usuario escribe usuario y contrasena.
2. El frontend llama la callable function `loginWithUsername`.
3. La funcion normaliza el usuario.
4. Busca el perfil en `users` por `usuario_normalizado`.
5. Lee credenciales privadas desde `user_credentials/{uid}`.
6. Compara la contrasena con `password_hash` usando bcrypt.
7. Genera un custom token con `admin.auth().createCustomToken`.
8. El frontend ejecuta `signInWithCustomToken`.
9. La app carga `users/{uid}` y usa `rol` para permisos.

## Colecciones

`users/{uid}` guarda solo perfil:

- `id`
- `nombre`
- `usuario`
- `usuario_normalizado`
- `rol`
- `estado`
- `requiere_cambio_password`
- `fecha_creacion`
- `creado_por`

`user_credentials/{uid}` guarda credenciales privadas:

- `usuario_normalizado`
- `password_hash`

El frontend nunca debe leer `user_credentials`.

## Crear Primer Admin

```bash
npm run create:admin -- --username admin --password 123456
```

Este script busca o crea un usuario administrador y configura su `password_hash`.

## Migrar Usuarios Existentes

```bash
npm run migrate:username-auth
```

Para asignar una contrasena inicial a un usuario especifico:

```bash
npm run migrate:username-auth -- --username Alicia.Cleque --password 123456
```

## Crear Usuarios Desde La Plataforma

El modulo Usuarios llama la callable function `createPlatformUser`. La funcion crea un UID sin email en Firebase Auth, guarda el perfil en `users/{uid}` y el hash en `user_credentials/{uid}`.

## Cambiar Contrasena

El modulo Usuarios usa `changeUserPasswordByAdmin`. No se usa reset por email.

## Produccion

Este flujo debe vivir en Cloud Functions o backend seguro. No usar reglas abiertas en produccion. `user_credentials` debe permanecer inaccesible desde cliente.
