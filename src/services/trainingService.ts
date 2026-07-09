import { auth } from '../lib/firebase';
import { getRuntimeEnv } from '../lib/runtimeConfig';
import type {
  AttendanceRecord,
  Participant,
  TrainingSession,
  TrainingSurvey,
} from '../types';

const API_BASE_URL =
  getRuntimeEnv('VITE_API_BASE_URL') || (import.meta.env.PROD ? '' : 'http://localhost:8080');

const request = async (path: string, options: RequestInit) => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'No se pudo guardar la capacitacion.');
  return payload;
};

export const createTrainingBundle = (
  session: TrainingSession,
  survey: TrainingSurvey,
  participants: Participant[],
  attendance: AttendanceRecord[],
) => request('/api/trainings', {
  method: 'POST',
  body: JSON.stringify({ session, survey, participants, attendance }),
});

export const updateTraining = (
  sessionId: string,
  changes: Partial<TrainingSession>,
) => request(`/api/trainings/${sessionId}`, {
  method: 'PATCH',
  body: JSON.stringify(changes),
});

export const appendTrainingParticipants = (
  sessionId: string,
  participants: Participant[],
  attendance: AttendanceRecord[],
) => request(`/api/trainings/${sessionId}/participants`, {
  method: 'POST',
  body: JSON.stringify({ participants, attendance }),
});
