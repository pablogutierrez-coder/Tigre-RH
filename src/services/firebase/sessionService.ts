import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { TrainingClosure, TrainingSession } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  getDocumentById,
  updateDocument,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getSessions = () =>
  getCollectionDocuments<TrainingSession>(FDR_COLLECTIONS.sessions);

export const getSessionById = (id: string) =>
  getDocumentById<TrainingSession>(FDR_COLLECTIONS.sessions, id);

export const getSessionsByCampaign = async (campaña: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.sessions),
    where('campaña', '==', campaña),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TrainingSession);
};

export const getSessionsByTrainer = async (formadorId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.sessions),
    where('formador_id', '==', formadorId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TrainingSession);
};

export const getSessionsByRecruiter = async (reclutadorId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.sessions),
    where('reclutador_id', '==', reclutadorId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TrainingSession);
};

export const createSession = (session: TrainingSession) =>
  createDocumentWithId(FDR_COLLECTIONS.sessions, session.id, session);

export const updateSession = (id: string, data: Partial<TrainingSession>) =>
  updateDocument<TrainingSession>(FDR_COLLECTIONS.sessions, id, data);

export const closeSession = async (
  id: string,
  closedBy: string,
  observation?: string,
) => {
  const closedAt = new Date().toISOString();
  await updateDocument<TrainingSession>(FDR_COLLECTIONS.sessions, id, {
    estado: 'Capacitación cerrada',
  });

  const closure: TrainingClosure = {
    id: `closure-${id}`,
    training_session_id: id,
    closed_by: closedBy,
    closed_at: closedAt,
    observation,
    validations: {},
    status: 'closed',
  };

  return createDocumentWithId(
    FDR_COLLECTIONS.trainingClosures,
    closure.id,
    closure,
  );
};
