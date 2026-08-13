import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { Prospect } from '../../types';
import { createDocumentAutoId, deleteDocument, updateDocument, withFirestoreId } from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const subscribeToProspects = (
  userId: string,
  isAdmin: boolean,
  callback: (prospects: Prospect[]) => void,
  onError?: (error: Error) => void,
) => {
  const source = collection(getRequiredDb(), FDR_COLLECTIONS.prospects);
  const prospectQuery = isAdmin ? source : query(source, where('formador_id', '==', userId));
  return onSnapshot(
  prospectQuery,
  (snapshot) => callback(
    snapshot.docs
      .map((item) => withFirestoreId(item.id, item.data() as Prospect))
      .sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro)),
  ),
  (error) => onError?.(error),
);
};

export const createProspect = (prospect: Omit<Prospect, 'id'>) =>
  createDocumentAutoId<Omit<Prospect, 'id'>>(FDR_COLLECTIONS.prospects, prospect);

export const updateProspect = (id: string, prospect: Partial<Prospect>) =>
  updateDocument<Prospect>(FDR_COLLECTIONS.prospects, id, prospect);

export const deleteProspect = (id: string) =>
  deleteDocument(FDR_COLLECTIONS.prospects, id);
