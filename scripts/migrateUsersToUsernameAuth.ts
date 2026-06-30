import bcrypt from 'bcryptjs';
import { adminDb } from './adminSdk';
import { getArg, normalizeUsername } from './usernameAuthUtils';

const main = async () => {
  const usernameArg = getArg('username');
  const passwordArg = getArg('password');
  const users = await adminDb.collection('users').get();

  for (const userDoc of users.docs) {
    const user = userDoc.data();
    const username = String(user.usuario || '');
    if (!username) continue;

    const usuarioNormalizado = normalizeUsername(username);
    const updates: Record<string, unknown> = {};
    if (!user.usuario_normalizado) {
      updates.usuario_normalizado = usuarioNormalizado;
    }

    if (Object.keys(updates).length > 0) {
      await userDoc.ref.set(updates, { merge: true });
      console.log(`Updated users/${userDoc.id}`);
    }

    if (usernameArg && passwordArg && usuarioNormalizado === normalizeUsername(usernameArg)) {
      const passwordHash = await bcrypt.hash(passwordArg, 12);
      await adminDb.collection('user_credentials').doc(userDoc.id).set(
        {
          id: userDoc.id,
          usuario_normalizado: usuarioNormalizado,
          password_hash: passwordHash,
          updated_at: new Date().toISOString(),
        },
        { merge: true },
      );
      console.log(`Credential updated for ${usernameArg}`);
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
