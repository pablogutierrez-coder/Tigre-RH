import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../../lib/firebase';
import type { User, UserRole } from '../../types';
import { normalizeUsername } from './authUsernameHelper';

export interface CreatePlatformUserData {
  nombre: string;
  usuario: string;
  password: string;
  rol: UserRole;
  estado: 'Activo' | 'Inactivo';
}

type PlatformUserProfile = Omit<User, 'password'>;

const getRequiredFunctions = () => {
  if (!app) throw new Error('Firebase is not configured. Check .env.local.');
  return getFunctions(app);
};

export const createPlatformUser = async (data: CreatePlatformUserData) => {
  const createFn = httpsCallable<
    CreatePlatformUserData,
    { user: PlatformUserProfile }
  >(getRequiredFunctions(), 'createPlatformUser');

  const result = await createFn({
    ...data,
    usuario: normalizeUsername(data.usuario),
  });
  return {
    ...result.data.user,
    correo: result.data.user.correo || '',
  };
};

export const updatePlatformUser = async (
  uid: string,
  data: Partial<Omit<User, 'id' | 'password' | 'fecha_creacion' | 'correo'>>,
) => {
  const updateFn = httpsCallable(getRequiredFunctions(), 'updatePlatformUser');
  await updateFn({
    uid,
    nombre: data.nombre,
    usuario: data.usuario ? normalizeUsername(data.usuario) : undefined,
    rol: data.rol,
    estado: data.estado,
  });
};

export const deactivatePlatformUser = async (uid: string) => {
  const deactivateFn = httpsCallable(getRequiredFunctions(), 'deactivatePlatformUser');
  await deactivateFn({ uid });
};

export const changeUserPasswordByAdmin = async (
  uid: string,
  newPassword: string,
) => {
  const changeFn = httpsCallable(getRequiredFunctions(), 'changeUserPasswordByAdmin');
  await changeFn({ uid, newPassword });
};
