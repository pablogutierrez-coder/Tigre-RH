# Railway Backend

## Por que Railway

La autenticacion personalizada se mueve a Railway para no depender de Firebase Functions ni del plan Blaze. Firebase Auth sigue usandose para la sesion, pero el token personalizado lo emite un backend Express con Firebase Admin SDK.

## Flujo de login

1. El frontend pide `usuario` y `contrasena`.
2. El frontend llama `POST /api/auth/login` en el backend Railway.
3. El backend normaliza el usuario y busca `user_credentials`.
4. El backend valida `password_hash` con bcrypt.
5. El backend genera un `customToken` con Firebase Admin SDK.
6. El frontend ejecuta `signInWithCustomToken(auth, customToken)`.
7. El frontend carga el perfil desde `Firestore/users/{uid}`.

No se usa Email/Password de Firebase, correo real ni correo tecnico.

## Colecciones

`users` guarda el perfil visible de la plataforma:

- `id`
- `nombre`
- `usuario`
- `usuario_normalizado`
- `rol`
- `estado`
- `requiere_cambio_password`
- `fecha_creacion`

`user_credentials` guarda credenciales privadas:

- `uid`
- `usuario_normalizado`
- `password_hash`
- `created_at`
- `updated_at`

El frontend nunca lee `password_hash` ni accede a `user_credentials`. Firestore Rules bloquea esa coleccion para clientes.

## Variables de Railway

Configurar estas variables privadas en el servicio backend:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `FRONTEND_ORIGIN`
- `BCRYPT_ROUNDS`
- `PORT`

Para enviar encuestas por correo desde Railway se usa Resend por API HTTPS:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` opcional
- `EMAIL_TRACE_COLLECTION` opcional

Ejemplo:

```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM="FDR Automatizate <encuestas@tudominio.com>"
EMAIL_REPLY_TO=encuestas@tudominio.com
EMAIL_TRACE_COLLECTION=correos_enviados
```

`EMAIL_FROM` debe usar un dominio verificado en Resend. No guardar `RESEND_API_KEY` en `.env.local` ni exponerla en React.

`FIREBASE_PRIVATE_KEY` puede pegarse con saltos `\n` escapados. El backend los convierte internamente con `replace(/\\n/g, "\n")`.

## Service Account

En Firebase Console:

1. Abrir Configuracion del proyecto.
2. Entrar a Cuentas de servicio.
3. Generar nueva clave privada.
4. Copiar los valores necesarios a Railway.

No subir el JSON de service account al repositorio.

## Configuracion de Railway

Crear un servicio desde GitHub usando el `Dockerfile` de la raiz del repositorio. Ese contenedor compila el frontend, copia `dist` dentro de `backend/public` y arranca el backend Express.

- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Healthcheck path: `/health`

Configurar las variables privadas listadas arriba.

El frontend debe tener `VITE_API_BASE_URL` apuntando al dominio publico de Railway o quedar vacio cuando frontend y backend viven en el mismo dominio.

## Probar local

```bash
cd backend
npm install
npm run dev
```

Health check:

```bash
curl http://localhost:8080/health
```

## Crear primer admin

```bash
cd backend
npm run create:admin -- --username admin --password 123456
```

Luego probar login:

- Usuario: `admin`
- Contrasena: `123456`

Usa una contrasena temporal fuerte en produccion y cambiala despues del primer acceso.

## Pendiente

- Endurecer reglas definitivas por modulo.
- Revisar rotacion de contrasenas y cambio obligatorio en la siguiente fase.
