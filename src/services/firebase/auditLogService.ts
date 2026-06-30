import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { AuditLog } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const createAuditLog = (log: AuditLog) =>
  createDocumentWithId(FDR_COLLECTIONS.logs, log.id, log);

export const getAuditLogs = () =>
  getCollectionDocuments<AuditLog>(FDR_COLLECTIONS.logs);

export const getAuditLogsByModule = async (modulo: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.logs),
    where('modulo', '==', modulo),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditLog);
};

export const getAuditLogsByEntity = async (
  entityType: string,
  entityId: string,
) => {
  const logs = await getAuditLogs();
  return logs.filter((log) => {
    if (entityType === 'participant') return log.participante_id === entityId;
    if (entityType === 'campaign') return log.campaña === entityId;
    if (entityType === 'generation') return log.generacion === entityId;
    return false;
  });
};
