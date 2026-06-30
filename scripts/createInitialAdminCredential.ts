import bcrypt from 'bcryptjs';
import { adminAuth, adminDb } from './adminSdk';
import { getArg, normalizeUsername } from './usernameAuthUtils';

const main = async () => {
  const username = getArg('username');
  const password = getArg('password');

  if (!username || !password) {
    throw new Error('Uso: npm run create:admin -- --username admin --password 123456');
  }

  const usuarioNormalizado = normalizeUsername(username);
  const existing = await adminDb
    .collection('users')
    .where('usuario_normalizado', '==', usuarioNormalizado)
    .limit(1)
    .get();

  let uid = existing.docs[0]?.id;

  if (!uid) {
    const byRawUsername = await adminDb
      .collection('users')
      .where('usuario', '==', username)
      .limit(1)
      .get();
    uid = byRawUsername.docs[0]?.id;
  }

  if (!uid) {
    const authUser = await adminAuth.createUser({});
    uid = authUser.uid;
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 12);

  await adminDb.collection('users').doc(uid).set(
    {
      id: uid,
      nombre: 'Administrador',
      usuario: username,
      usuario_normalizado: usuarioNormalizado,
      rol: 'Administrador',
      estado: 'Activo',
      requiere_cambio_password: true,
      fecha_creacion: now,
    },
    { merge: true },
  );

  await adminDb.collection('user_credentials').doc(uid).set(
    {
      id: uid,
      usuario_normalizado: usuarioNormalizado,
      password_hash: passwordHash,
      updated_at: now,
    },
    { merge: true },
  );

  console.log(`Admin listo: ${username} (${uid})`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
