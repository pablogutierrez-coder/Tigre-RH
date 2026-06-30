import bcrypt from 'bcryptjs';
import { adminAuth, adminDb } from '../firebaseAdmin.js';
import { normalizeUsername } from '../utils/normalizeUsername.js';

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode = 401,
  ) {
    super(message);
  }
}

interface UserProfile {
  id: string;
  nombre: string;
  usuario: string;
  usuario_normalizado: string;
  rol: string;
  estado: string;
}

const genericCredentialsError = () =>
  new AuthError('Usuario o contrasena incorrectos.', 401);

export const loginWithUsername = async (username: string, password: string) => {
  const usuarioNormalizado = normalizeUsername(username);

  const credentialSnapshot = await adminDb
    .collection('user_credentials')
    .where('usuario_normalizado', '==', usuarioNormalizado)
    .limit(1)
    .get();

  if (credentialSnapshot.empty) {
    throw genericCredentialsError();
  }

  const credentialDoc = credentialSnapshot.docs[0];
  const credential = credentialDoc.data();
  const uid = String(credential.uid || credentialDoc.id);
  const passwordHash = credential.password_hash;

  if (!uid || typeof passwordHash !== 'string') {
    throw genericCredentialsError();
  }

  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    throw new AuthError('Perfil de usuario no encontrado.', 500);
  }

  const profile = userDoc.data() as UserProfile;
  if (profile.estado !== 'Activo') {
    throw new AuthError('Usuario inactivo.', 403);
  }

  const passwordOk = await bcrypt.compare(password, passwordHash);
  if (!passwordOk) {
    throw genericCredentialsError();
  }

  const customToken = await adminAuth.createCustomToken(uid, {
    rol: profile.rol,
    usuario: profile.usuario_normalizado || usuarioNormalizado,
  });

  return {
    customToken,
    user: {
      id: uid,
      nombre: profile.nombre,
      usuario: profile.usuario,
      usuario_normalizado: profile.usuario_normalizado || usuarioNormalizado,
      rol: profile.rol,
      estado: profile.estado,
    },
  };
};
