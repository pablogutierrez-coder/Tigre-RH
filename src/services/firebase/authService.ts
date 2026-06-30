import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { app, auth, db } from '../../lib/firebase';
import type { User } from '../../types';
import { normalizeUsername } from './authUsernameHelper';

type UserProfile = Omit<User, 'password'>;

interface LoginWithUsernameResponse {
  customToken: string;
  user: {
    id: string;
    nombre: string;
    usuario: string;
    rol: User['rol'];
    estado: User['estado'];
  };
}

const getRequiredAuth = () => {
  if (!auth) throw new Error('Firebase Auth is not configured. Check .env.local.');
  return auth;
};

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

const getRequiredFunctions = () => {
  if (!app) throw new Error('Firebase is not configured. Check .env.local.');
  return getFunctions(app);
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
  const normalizedUsername = normalizeUsername(username);
  const loginFn = httpsCallable<
    { username: string; password: string },
    LoginWithUsernameResponse
  >(getRequiredFunctions(), 'loginWithUsername');

  const result = await loginFn({ username: normalizedUsername, password });
  await signInWithCustomToken(getRequiredAuth(), result.data.customToken);

  const profile = await getCurrentUserProfile(result.data.user.id);
  if (!profile) {
    await signOut(getRequiredAuth());
    throw new Error('La sesión fue creada, pero no se encontró el perfil del usuario.');
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
