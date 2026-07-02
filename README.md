# FDR Formacion y Desarrollo

Plataforma React/Vite para control de capacitaciones, asistencia, altas, reaperturas, reportes, auditoria y encuestas.

## Stack

- React + Vite + TypeScript
- Firebase Auth con Custom Tokens
- Firestore
- Backend Express en Railway
- Firebase Storage preparado
- Railway para hosting del frontend
- Resend para envio de encuestas por correo

## Desarrollo Local

```bash
npm install
npm run dev
```

## Validacion

```bash
npm run lint
npm run build
cd backend
npm run build
```

## Variables De Entorno

El frontend usa variables `VITE_FIREBASE_*` y `VITE_API_BASE_URL` en `.env.local`.

El backend Railway usa variables privadas sin prefijo `VITE_*`.

No subir `.env.local` al repositorio.

Para enviar encuestas por correo, Railway tambien necesita variables privadas de Resend:

```env
RESEND_API_KEY=
EMAIL_FROM=
EMAIL_REPLY_TO=
EMAIL_TRACE_COLLECTION=
```

## Auth Por Usuario

La plataforma no usa correo para login. El flujo usa:

1. Usuario + contrasena.
2. Backend Railway `POST /api/auth/login`.
3. Bcrypt contra `user_credentials`.
4. Firebase Custom Token.
5. Sesion con Firebase Auth.

Ver `docs/railway-backend.md`.

## Scripts Importantes

```bash
npm run backend:create:admin -- --username admin --password 123456
npm run migrate:username-auth
npm run deploy:rules
```

## Railway

Frontend:

- Se compila dentro del `Dockerfile`.

Config en `railway.json`.

Backend:

- Se ejecuta desde el mismo contenedor Railway.
- Start interno: `node backend/dist/index.js`
