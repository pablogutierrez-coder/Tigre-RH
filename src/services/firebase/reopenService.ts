import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { AttendanceReopenRequest } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  updateDocument,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getReopenRequests = () =>
  getCollectionDocuments<AttendanceReopenRequest>(FDR_COLLECTIONS.reopens);

export const getReopenRequestsBySession = async (sessionId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.reopens),
    where('training_session_id', '==', sessionId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as AttendanceReopenRequest,
  );
};

export const createReopenRequest = (request: AttendanceReopenRequest) =>
  createDocumentWithId(FDR_COLLECTIONS.reopens, request.id, request);

export const approveReopenRequest = (id: string, adminName: string) =>
  updateDocument<AttendanceReopenRequest>(FDR_COLLECTIONS.reopens, id, {
    estado: 'aprobada',
    aprobado_por: adminName,
    fecha_respuesta: new Date().toISOString(),
  });

export const rejectReopenRequest = (
  id: string,
  adminName: string,
  reason: string,
) =>
  updateDocument<AttendanceReopenRequest>(FDR_COLLECTIONS.reopens, id, {
    estado: 'rechazada',
    aprobado_por: adminName,
    fecha_respuesta: new Date().toISOString(),
    comentario_respuesta: reason,
  });
