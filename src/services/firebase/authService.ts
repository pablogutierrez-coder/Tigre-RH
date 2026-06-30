import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { auth, db } from '../../lib/firebase';
import type { User } from '../../types';

type UserProfile = Omit<User, 'password'>;

interface LoginWithUsernameResponse {
  customToken: string;
  user: {
    id: string;
    nombre: string;
    usuario: string;
    usuario_normalizado: string;
    rol: User['rol'];
    estado: User['estado'];
  };
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:8080');

const getRequiredAuth = () => {
  if (!auth) throw new Error('Firebase Auth is not configured. Check .env.local.');
  return auth;
};

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

const mapUserProfile = (id: string, data: unknown): UserProfile => {
  const profile = data as UserProfile;
  return {
    ...profile,
    id,
    correo: profile.correo || '',
  };
};

export const getCurrentUserProfile = async (uid: string) => {
  const snapshot = await getDoc(doc(getRequiredDb(), FDR_COLLECTIONS.users, uid));
  if (!snapshot.exists()) return null;
  return mapUserProfile(snapshot.id, snapshot.data());
};

export const loginWithUsername = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const payload = (await response.json().catch(() => null)) as
    | (LoginWithUsernameResponse & { message?: string })
    | null;

  if (!response.ok || !payload?.customToken) {
    throw new Error(payload?.message || 'No se pudo iniciar sesion.');
  }

  const credential = await signInWithCustomToken(getRequiredAuth(), payload.customToken);
  const profile = await getCurrentUserProfile(credential.user.uid);

  if (!profile) {
    await signOut(getRequiredAuth());
    throw new Error('La sesion fue creada, pero no se encontro el perfil del usuario.');
  }

  return profile;
};

export const logoutFirebase = () => signOut(getRequiredAuth());

export const subscribeToAuthChanges = (
  callback: (profile: UserProfile | null, firebaseUser: FirebaseUser | null) => void,
) =>
  onAuthStateChanged(getRequiredAuth(), async (firebaseUser) => {
    try {
      if (!firebaseUser) {
        callback(null, null);
        return;
      }

      const profile = await getCurrentUserProfile(firebaseUser.uid);
      callback(profile, firebaseUser);
    } catch (error) {
      console.error('Error loading Firebase user profile:', error);
      callback(null, firebaseUser);
    }
  });
