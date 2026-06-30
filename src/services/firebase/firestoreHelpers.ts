import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | Date
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

const getDb = () => {
  if (!db) {
    throw new Error('Firebase Firestore is not configured. Check .env.local.');
  }
  return db;
};

export const removeUndefinedValues = <T>(obj: T): T => {
  if (Array.isArray(obj)) {
    return obj.map((item) => removeUndefinedValues(item)) as T;
  }

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    const cleaned = Object.entries(obj as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = removeUndefinedValues(value);
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );

    return cleaned as T;
  }

  return obj;
};

export const withFirestoreId = <T>(id: string, data: T): T & { id: string } => ({
  ...(data as T & Record<string, FirestoreValue>),
  id,
});

export const toISODate = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  if (typeof value === 'number') return new Date(value).toISOString();
  return undefined;
};

export const createDocumentWithId = async <T>(
  collectionName: string,
  id: string,
  data: T,
) => {
  const cleanData = removeUndefinedValues(withFirestoreId(id, data));
  await setDoc(doc(getDb(), collectionName, id), cleanData as DocumentData, {
    merge: true,
  });
  return cleanData;
};

export const createDocumentAutoId = async <T>(
  collectionName: string,
  data: T,
) => {
  const cleanData = removeUndefinedValues(data);
  const ref = await addDoc(
    collection(getDb(), collectionName),
    cleanData as DocumentData,
  );
  return withFirestoreId(ref.id, cleanData);
};

export const updateDocument = async <T>(
  collectionName: string,
  id: string,
  data: Partial<T>,
) => {
  const cleanData = removeUndefinedValues(data);
  await updateDoc(doc(getDb(), collectionName, id), cleanData as DocumentData);
  return withFirestoreId(id, cleanData);
};

export const deleteDocument = async (collectionName: string, id: string) => {
  await deleteDoc(doc(getDb(), collectionName, id));
};

export const getDocumentById = async <T>(collectionName: string, id: string) => {
  const snapshot = await getDoc(doc(getDb(), collectionName, id));
  if (!snapshot.exists()) return null;
  return withFirestoreId(snapshot.id, snapshot.data() as T);
};

export const getCollectionDocuments = async <T>(collectionName: string) => {
  const snapshot = await getDocs(collection(getDb(), collectionName));
  return snapshot.docs.map((item) => withFirestoreId(item.id, item.data() as T));
};
