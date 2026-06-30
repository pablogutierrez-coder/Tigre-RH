import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { OperationConfirmation } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  updateDocument,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getConfirmations = () =>
  getCollectionDocuments<OperationConfirmation>(FDR_COLLECTIONS.confirmations);

export const getConfirmationsBySession = async (sessionId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.confirmations),
    where('training_session_id', '==', sessionId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as OperationConfirmation,
  );
};

export const saveConfirmation = (confirmation: OperationConfirmation) =>
  createDocumentWithId(
    FDR_COLLECTIONS.confirmations,
    confirmation.id,
    confirmation,
  );

export const deleteConfirmationLogical = (id: string, deletedBy: string) =>
  updateDocument<OperationConfirmation>(FDR_COLLECTIONS.confirmations, id, {
    estado_alta: 'Eliminada',
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
  });
