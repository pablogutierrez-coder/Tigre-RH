# Deploy Checklist

## Antes De GitHub

- Confirmar que `.env.local` no se sube.
- Confirmar que no existen service accounts en el repo.
- Ejecutar `npm run lint`.
- Ejecutar `npm run build`.
- Ejecutar `cd backend && npm install && npm run build`.
- Revisar que `user_credentials` no sea accesible desde cliente.

## Firebase

1. Autenticarse con Firebase CLI o usar `npx firebase-tools login`.
2. Desplegar reglas:

```bash
npm run deploy:rules
```

3. Crear admin inicial desde el backend:

```bash
cd backend
npm run create:admin -- --username admin --password 123456
```

4. Probar login local con usuario y contrasena.

## GitHub

```bash
git init
git add .
git commit -m "Prepare FDR platform for Firebase and Railway"
```

Crear repositorio en GitHub y seguir las instrucciones para agregar `origin` y hacer push.

## Railway

1. Crear proyecto desde el repositorio de GitHub.
2. Crear servicio frontend y configurar variables `VITE_FIREBASE_*` y `VITE_API_BASE_URL`.
3. Crear servicio backend con Root Directory `backend`.
4. Configurar variables privadas del backend.
5. Deploy.
6. Probar login productivo.

## Pendientes Recomendados

- Cambiar password temporal del admin.
- Revisar bundle grande de Vite.
- Revisar vulnerabilidad conocida de `xlsx`.
- Evaluar remover dependencias no usadas despues de estabilizar el deploy.
