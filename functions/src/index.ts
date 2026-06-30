import bcrypt from 'bcryptjs';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

admin.initializeApp();

const db = admin.firestore();

const normalizeUsername = (username: string) => {
  const normalized = username
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');

  if (!normalized) {
    throw new HttpsError('invalid-argument', 'Usuario inválido.');
  }

  return normalized;
};

const requireRole = async (uid?: string, allowedRoles: string[] = []) => {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Debe iniciar sesión.');
  }

  const profile = await db.collection('users').doc(uid).get();
  const role = profile.data()?.rol;

  if (!allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'No tiene permisos para esta operación.');
  }

  return profile.data();
};

const getUserByNormalizedUsername = async (usuarioNormalizado: string) => {
  const snapshot = await db
    .collection('users')
    .where('usuario_normalizado', '==', usuarioNormalizado)
    .limit(1)
    .get();

  return snapshot.docs[0] || null;
};

const getCredentialsByNormalizedUsername = async (usuarioNormalizado: string) => {
  const snapshot = await db
    .collection('user_credentials')
    .where('usuario_normalizado', '==', usuarioNormalizado)
    .limit(1)
    .get();

  return snapshot.docs[0] || null;
};

const createAuditLog = async (
  actorUid: string,
  action: string,
  detail: string,
  role = 'Administrador',
) => {
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await db.collection('logs').doc(id).set({
    id,
    usuario_id: actorUid,
    usuario_nombre: actorUid,
    rol: role,
    accion: action,
    modulo: 'Usuarios FDR',
    detalle: detail,
    fecha: new Date().toISOString(),
  });
};

export const loginWithUsername = onCall(async (request) => {
  const username = String(request.data?.username || '');
  const password = String(request.data?.password || '');

  if (!username || !password) {
    throw new HttpsError('invalid-argument', 'Ingrese usuario y contraseña.');
  }

  const usuarioNormalizado = normalizeUsername(username);
  const userDoc = await getUserByNormalizedUsername(usuarioNormalizado);
  const credentialsDoc = await getCredentialsByNormalizedUsername(usuarioNormalizado);

  if (!userDoc || !credentialsDoc) {
    throw new HttpsError('unauthenticated', 'Usuario o contraseña incorrectos.');
  }

  const user = userDoc.data();
  const credentials = credentialsDoc.data();

  if (user.estado !== 'Activo') {
    throw new HttpsError('permission-denied', 'Usuario inactivo.');
  }

  if (!credentials.password_hash) {
    throw new HttpsError('failed-precondition', 'Usuario sin credenciales configuradas.');
  }

  const validPassword = await bcrypt.compare(password, credentials.password_hash);
  if (!validPassword) {
    throw new HttpsError('unauthenticated', 'Usuario o contraseña incorrectos.');
  }

  const customToken = await admin.auth().createCustomToken(userDoc.id, {
    role: user.rol,
    username: user.usuario,
  });

  return {
    customToken,
    user: {
      id: userDoc.id,
      nombre: user.nombre,
      usuario: user.usuario,
      rol: user.rol,
      estado: user.estado,
    },
  };
});

export const createPlatformUser = onCall(async (request) => {
  const actor = await requireRole(request.auth?.uid, ['Administrador', 'Analista']);
  const { nombre, usuario, password, rol, estado } = request.data || {};

  if (!nombre || !usuario || !password || !rol || !estado) {
    throw new HttpsError('invalid-argument', 'Datos de usuario incompletos.');
  }

  const usuarioNormalizado = normalizeUsername(String(usuario));
  const existing = await getUserByNormalizedUsername(usuarioNormalizado);
  if (existing) {
    throw new HttpsError('already-exists', 'Ya existe un usuario con ese nombre de acceso.');
  }

  const authUser = await admin.auth().createUser({});
  const uid = authUser.uid;
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(String(password), 12);

  const profile = {
    id: uid,
    nombre: String(nombre),
    usuario: String(usuario),
    usuario_normalizado: usuarioNormalizado,
    rol: String(rol),
    estado: String(estado),
    requiere_cambio_password: true,
    fecha_creacion: now,
    creado_por: request.auth?.uid || '',
  };

  await db.collection('users').doc(uid).set(profile);
  await db.collection('user_credentials').doc(uid).set({
    id: uid,
    usuario_normalizado: usuarioNormalizado,
    password_hash: passwordHash,
    updated_at: now,
  });
  await createAuditLog(
    request.auth?.uid || '',
    'Creación de usuario',
    `Se creó el usuario "${profile.usuario}" con rol "${profile.rol}".`,
    actor?.rol,
  );

  return { user: profile };
});

export const updatePlatformUser = onCall(async (request) => {
  await requireRole(request.auth?.uid, ['Administrador', 'Analista']);
  const { uid, nombre, usuario, rol, estado } = request.data || {};

  if (!uid) {
    throw new HttpsError('invalid-argument', 'UID requerido.');
  }

  const updateData: Record<string, unknown> = {};
  if (nombre !== undefined) updateData.nombre = String(nombre);
  if (rol !== undefined) updateData.rol = String(rol);
  if (estado !== undefined) updateData.estado = String(estado);
  if (usuario !== undefined) {
    const usuarioNormalizado = normalizeUsername(String(usuario));
    updateData.usuario = String(usuario);
    updateData.usuario_normalizado = usuarioNormalizado;
    await db.collection('user_credentials').doc(String(uid)).set(
      { usuario_normalizado: usuarioNormalizado, updated_at: new Date().toISOString() },
      { merge: true },
    );
  }

  await db.collection('users').doc(String(uid)).set(updateData, { merge: true });
  return { ok: true };
});

export const changeUserPasswordByAdmin = onCall(async (request) => {
  await requireRole(request.auth?.uid, ['Administrador', 'Analista']);
  const { uid, newPassword } = request.data || {};

  if (!uid || !newPassword) {
    throw new HttpsError('invalid-argument', 'UID y nueva contraseña son requeridos.');
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  const now = new Date().toISOString();
  await db.collection('user_credentials').doc(String(uid)).set(
    {
      id: String(uid),
      password_hash: passwordHash,
      updated_at: now,
    },
    { merge: true },
  );
  await db.collection('users').doc(String(uid)).set(
    {
      requiere_cambio_password: true,
    },
    { merge: true },
  );

  return { ok: true };
});

export const deactivatePlatformUser = onCall(async (request) => {
  await requireRole(request.auth?.uid, ['Administrador', 'Analista']);
  const uid = String(request.data?.uid || '');

  if (!uid) {
    throw new HttpsError('invalid-argument', 'UID requerido.');
  }

  await db.collection('users').doc(uid).set({ estado: 'Inactivo' }, { merge: true });
  return { ok: true };
});
