import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { User, UserRole } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  getDocumentById,
  updateDocument,
} from './firestoreHelpers';

type UserProfile = Omit<User, 'password'>;

const stripPassword = (user: User): UserProfile => {
  const { password: _password, ...profile } = user;
  return profile;
};

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getUserById = (id: string) =>
  getDocumentById<UserProfile>(FDR_COLLECTIONS.users, id);

export const getUserByEmail = async (correo: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.users),
    where('correo', '==', correo),
  );
  const snapshot = await getDocs(q);
  const item = snapshot.docs[0];
  return item ? ({ id: item.id, ...item.data() } as UserProfile) : null;
};

export const getActiveUsers = async () => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.users),
    where('estado', '==', 'Activo'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as UserProfile);
};

export const getUsersByRole = async (rol: UserRole) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.users),
    where('rol', '==', rol),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as UserProfile);
};

export const createUserProfile = (user: User) =>
  createDocumentWithId(FDR_COLLECTIONS.users, user.id, stripPassword(user));

export const updateUserProfile = (id: string, data: Partial<User>) => {
  const { password: _password, ...profileData } = data;
  return updateDocument<UserProfile>(FDR_COLLECTIONS.users, id, profileData);
};

export const deactivateUser = (id: string) =>
  updateDocument<UserProfile>(FDR_COLLECTIONS.users, id, { estado: 'Inactivo' });

export const getUsers = () =>
  getCollectionDocuments<UserProfile>(FDR_COLLECTIONS.users);
