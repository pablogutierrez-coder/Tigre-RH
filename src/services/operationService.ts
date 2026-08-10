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

const post = async <T>(path: string, body: unknown, forceTokenRefresh = false): Promise<T> => {
  const token = await auth?.currentUser?.getIdToken(forceTokenRefresh);
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'No se pudo procesar la solicitud.');
  return data as T;
};

const get = async <T>(path: string): Promise<T> => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'No se pudo obtener la informacion.');
  return data as T;
};

const remove = async (path: string) => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'No se pudo eliminar el registro.');
};

export const persistAttendance = (record: AttendanceRecord) =>
  save(`/api/operations/attendance/${record.id}`, record);

export const persistConfirmation = (confirmation: OperationConfirmation) =>
  save(`/api/operations/confirmations/${confirmation.id}`, confirmation);

export const persistParticipant = (participant: Participant) =>
  save(`/api/operations/participants/${participant.id}`, participant);

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',').pop() || '' : result);
    };
    reader.readAsDataURL(file);
  });

export const uploadParticipantCvRemote = async (
  participantId: string,
  trainingSessionId: string,
  file: File,
) => {
  const data = await post<{ participant: Participant }>(
    `/api/operations/participants/${participantId}/cv`,
    {
      training_session_id: trainingSessionId,
      file_name: file.name,
      content_type: file.type || 'application/octet-stream',
      base64: await fileToBase64(file),
    },
    true,
  );
  return data.participant;
};

export const getParticipantCvUrlRemote = async (participantId: string) => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}/api/operations/participants/${participantId}/cv-content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'No se pudo obtener el CV.');
  }
  return URL.createObjectURL(await response.blob());
};

export const deleteParticipantRemote = (participantId: string) =>
  remove(`/api/operations/participants/${participantId}`);

export const persistReopenRequest = (request: AttendanceReopenRequest) =>
  save(`/api/operations/reopens/${request.id}`, request);
