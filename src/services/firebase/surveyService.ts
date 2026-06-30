import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type {
  Participant,
  SurveyResponse,
  SurveyStatus,
  TrainingSurvey,
} from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  updateDocument,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getSurveys = () =>
  getCollectionDocuments<TrainingSurvey>(FDR_COLLECTIONS.surveys);

export const getSurveyByToken = async (token: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.surveys),
    where('token', '==', token),
  );
  const snapshot = await getDocs(q);
  const item = snapshot.docs[0];
  return item ? ({ id: item.id, ...item.data() } as TrainingSurvey) : null;
};

export const getSurveysBySession = async (sessionId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.surveys),
    where('training_session_id', '==', sessionId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as TrainingSurvey);
};

export const createSurvey = (survey: TrainingSurvey) =>
  createDocumentWithId(FDR_COLLECTIONS.surveys, survey.id, survey);

export const updateSurveyStatus = (surveyId: string, status: SurveyStatus) =>
  updateDocument<TrainingSurvey>(FDR_COLLECTIONS.surveys, surveyId, {
    estado: status,
  });

export const saveSurveyResponse = (response: SurveyResponse) =>
  createDocumentWithId(FDR_COLLECTIONS.responses, response.id, response);

export const getResponses = () =>
  getCollectionDocuments<SurveyResponse>(FDR_COLLECTIONS.responses);

export const getResponsesBySurvey = async (surveyId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.responses),
    where('training_survey_id', '==', surveyId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as SurveyResponse);
};

export const getResponsesBySession = async (sessionId: string) => {
  const surveys = await getSurveysBySession(sessionId);
  const responses = await getResponses();
  const surveyIds = new Set(surveys.map((survey) => survey.id));
  return responses.filter((response) => surveyIds.has(response.training_survey_id));
};

export const validateSurveyCompletedByParticipants = (
  sessionId: string,
  participants: Participant[],
  responses: SurveyResponse[],
  surveys: TrainingSurvey[] = [],
) => {
  const relatedSurveys = surveys.filter(
    (survey) =>
      survey.training_session_id === sessionId &&
      (survey.estado === 'Habilitada' || survey.estado === 'Cerrada'),
  );
  if (relatedSurveys.length === 0) return true;

  const relatedSurveyIds = new Set(relatedSurveys.map((survey) => survey.id));
  const activeParticipants = participants.filter(
    (participant) =>
      participant.training_session_id === sessionId &&
      participant.estado_final !== 'Desistió' &&
      participant.estado_final !== 'No asistió',
  );

  return activeParticipants.every((participant) =>
    responses.some(
      (response) =>
        response.participant_id === participant.id &&
        relatedSurveyIds.has(response.training_survey_id),
    ),
  );
};
