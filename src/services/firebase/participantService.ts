import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { Participant } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  updateDocument,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getParticipants = () =>
  getCollectionDocuments<Participant>(FDR_COLLECTIONS.participants);

export const getParticipantsBySession = async (sessionId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.participants),
    where('training_session_id', '==', sessionId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Participant);
};

export const createParticipant = (participant: Participant) =>
  createDocumentWithId(
    FDR_COLLECTIONS.participants,
    participant.id,
    participant,
  );

export const createParticipantsBulk = (participants: Participant[]) =>
  Promise.all(participants.map((participant) => createParticipant(participant)));

export const updateParticipant = (id: string, data: Partial<Participant>) =>
  updateDocument<Participant>(FDR_COLLECTIONS.participants, id, data);

export const updateParticipantOutcome = (
  id: string,
  resultado_formacion: 'Marcar' | 'Apto' | 'No apto',
  comentario_aptitud?: string,
  motivo_no_apt?: string,
) =>
  updateDocument<Participant>(FDR_COLLECTIONS.participants, id, {
    resultado_formacion,
    comentario_aptitud,
    motivo_no_apt,
  });
