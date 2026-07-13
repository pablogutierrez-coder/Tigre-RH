import { auth } from '../lib/firebase';
import { getRuntimeEnv } from '../lib/runtimeConfig';
import type { AttendanceRecord, AttendanceReopenRequest, OperationConfirmation, Participant } from '../types';

const API_BASE_URL =
  getRuntimeEnv('VITE_API_BASE_URL') || (import.meta.env.PROD ? '' : 'http://localhost:8080');

const save = async (path: string, body: unknown) => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'No se pudo guardar el registro.');
};

export const persistAttendance = (record: AttendanceRecord) =>
  save(`/api/operations/attendance/${record.id}`, record);

export const persistConfirmation = (confirmation: OperationConfirmation) =>
  save(`/api/operations/confirmations/${confirmation.id}`, confirmation);

export const persistParticipant = (participant: Participant) =>
  save(`/api/operations/participants/${participant.id}`, participant);

export const persistReopenRequest = (request: AttendanceReopenRequest) =>
  save(`/api/operations/reopens/${request.id}`, request);
