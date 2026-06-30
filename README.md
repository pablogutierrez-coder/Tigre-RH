# FDR Formacion y Desarrollo

Plataforma React/Vite para control de capacitaciones, asistencia, altas, reaperturas, reportes, auditoria y encuestas.

## Stack

- React + Vite + TypeScript
- Firebase Auth con Custom Tokens
- Firestore
- Firebase Cloud Functions
- Firebase Storage preparado
- Railway para hosting del frontend

## Desarrollo Local

```bash
npm install
npm run dev
```

## Validacion

```bash
npm run lint
npm run build
cd functions
npm run build
```

## Variables De Entorno

El frontend usa variables `VITE_FIREBASE_*` en `.env.local`.

No subir `.env.local` al repositorio.

## Auth Por Usuario

La plataforma no usa correo para login. El flujo usa:

1. Usuario + contrasena.
2. Cloud Function `loginWithUsername`.
3. Bcrypt contra `user_credentials`.
4. Firebase Custom Token.
5. Sesion con Firebase Auth.

Ver `docs/user-auth-flow.md`.

## Scripts Importantes

```bash
npm run create:admin -- --username admin --password 123456
npm run migrate:username-auth
npm run deploy:rules
npm run deploy:functions
```

## Railway

Railway usa:

- Build: `npm ci && npm run build`
- Start: `npm run start`

Config en `railway.json`.
