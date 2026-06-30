import bcrypt from 'bcryptjs';
import type { DocumentData } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../firebaseAdmin.js';
import { normalizeUsername } from '../utils/normalizeUsername.js';
import { createAuditLog } from './auditService.js';

export interface Actor {
  uid: string;
  nombre: string;
}

export interface CreatePlatformUserData {
  nombre: string;
  usuario: string;
  password: string;
  rol: string;
  estado: 'Activo' | 'Inactivo';
}

export interface UpdatePlatformUserData {
  nombre?: string;
  usuario?: string;
  rol?: string;
  estado?: 'Activo' | 'Inactivo';
}

const getBcryptRounds = () => {
  const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
  return Number.isFinite(rounds) && rounds >= 8 ? rounds : 10;
};

const userForClient = (uid: string, data: DocumentData) => ({
  id: uid,
  nombre: data.nombre,
  correo: data.correo || '',
  usuario: data.usuario,
  usuario_normalizado: data.usuario_normalizado,
  rol: data.rol,
  estado: data.estado,
  fecha_creacion: data.fecha_creacion,
  creado_por: data.creado_por,
  requiere_cambio_password: data.requiere_cambio_password,
});

const assertUsernameAvailable = async (
  usuarioNormalizado: string,
  currentUid?: string,
) => {
  const snapshot = await adminDb
    .collection('user_credentials')
    .where('usuario_normalizado', '==', usuarioNormalizado)
    .limit(1)
    .get();

  if (!snapshot.empty && snapshot.docs[0].id !== currentUid) {
    throw new Error('El usuario ya existe.');
  }
};

const ensureAuthUser = async (uid: string, nombre: string, disabled: boolean) => {
  try {
    await adminAuth.createUser({
      uid,
      displayName: nombre,
      disabled,
    });
  } catch (error) {
    const authError = error as { code?: string };
    if (authError.code === 'auth/uid-already-exists') {
      await adminAuth.updateUser(uid, {
        displayName: nombre,
        disabled,
      });
      return;
    }

    throw error;
  }
};

export const createPlatformUser = async (
  data: CreatePlatformUserData,
  createdBy: Actor,
) => {
  const usuarioNormalizado = normalizeUsername(data.usuario);
  await assertUsernameAvailable(usuarioNormalizado);

  const uid = adminDb.collection('users').doc().id;
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(data.password, getBcryptRounds());

  await ensureAuthUser(uid, data.nombre, data.estado !== 'Activo');

  const profile = {
    id: uid,
    nombre: data.nombre,
    correo: '',
    usuario: data.usuario,
    usuario_normalizado: usuarioNormalizado,
    rol: data.rol,
    estado: data.estado,
    requiere_cambio_password: true,
    fecha_creacion: now,
    creado_por: createdBy.uid,
  };

  await adminDb.collection('users').doc(uid).set(profile);
  await adminDb.collection('user_credentials').doc(uid).set({
    uid,
    usuario_normalizado: usuarioNormalizado,
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  });

  await createAuditLog({
    modulo: 'Usuarios',
    accion: 'Crear usuario',
    usuario_id: createdBy.uid,
    usuario_nombre: createdBy.nombre,
    entityType: 'user',
    entityId: uid,
    detalle: `Usuario creado: ${data.usuario}`,
  });

  return userForClient(uid, profile);
};

export const updatePlatformUser = async (
  uid: string,
  data: UpdatePlatformUserData,
  updatedBy: Actor,
) => {
  const userRef = adminDb.collection('users').doc(uid);
  const current = await userRef.get();
  if (!current.exists) {
    throw new Error('Usuario no encontrado.');
  }

  const updateData: Record<string, unknown> = {};

  if (data.nombre !== undefined) updateData.nombre = data.nombre;
  if (data.rol !== undefined) updateData.rol = data.rol;
  if (data.estado !== undefined) updateData.estado = data.estado;

  if (data.usuario !== undefined) {
    const usuarioNormalizado = normalizeUsername(data.usuario);
    await assertUsernameAvailable(usuarioNormalizado, uid);
    updateData.usuario = data.usuario;
    updateData.usuario_normalizado = usuarioNormalizado;
    await adminDb.collection('user_credentials').doc(uid).set(
      {
        uid,
        usuario_normalizado: usuarioNormalizado,
        updated_at: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  await userRef.set(updateData, { merge: true });

  if (data.nombre !== undefined || data.estado !== undefined) {
    const authUpdate: { displayName?: string; disabled?: boolean } = {};
    if (data.nombre !== undefined) authUpdate.displayName = data.nombre;
    if (data.estado !== undefined) authUpdate.disabled = data.estado === 'Inactivo';
    await adminAuth.updateUser(uid, authUpdate);
  }

  await createAuditLog({
    modulo: 'Usuarios',
    accion: 'Actualizar usuario',
    usuario_id: updatedBy.uid,
    usuario_nombre: updatedBy.nombre,
    entityType: 'user',
    entityId: uid,
    detalle: `Usuario actualizado: ${uid}`,
  });
};

export const changeUserPasswordByAdmin = async (
  uid: string,
  newPassword: string,
  changedBy: Actor,
) => {
  const passwordHash = await bcrypt.hash(newPassword, getBcryptRounds());
  const now = new Date().toISOString();

  await adminDb.collection('user_credentials').doc(uid).set(
    {
      uid,
      password_hash: passwordHash,
      updated_at: now,
    },
    { merge: true },
  );

  await adminDb.collection('users').doc(uid).set(
    {
      requiere_cambio_password: true,
    },
    { merge: true },
  );

  await createAuditLog({
    modulo: 'Usuarios',
    accion: 'Cambiar contrasena',
    usuario_id: changedBy.uid,
    usuario_nombre: changedBy.nombre,
    entityType: 'user',
    entityId: uid,
    detalle: `Contrasena actualizada para usuario: ${uid}`,
  });
};

export const deactivatePlatformUser = async (uid: string, changedBy: Actor) => {
  await adminDb.collection('users').doc(uid).set(
    {
      estado: 'Inactivo',
    },
    { merge: true },
  );
  await adminAuth.updateUser(uid, { disabled: true });

  await createAuditLog({
    modulo: 'Usuarios',
    accion: 'Desactivar usuario',
    usuario_id: changedBy.uid,
    usuario_nombre: changedBy.nombre,
    entityType: 'user',
    entityId: uid,
    detalle: `Usuario desactivado: ${uid}`,
  });
};
