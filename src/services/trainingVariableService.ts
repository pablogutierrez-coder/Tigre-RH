import { auth } from '../lib/firebase';
import { getRuntimeEnv } from '../lib/runtimeConfig';
import type { TrainingVariableEvaluation } from '../types';

export type TrainingVariablePayload = Pick<
  TrainingVariableEvaluation,
  | 'anio'
  | 'mes'
  | 'id_formador'
  | 'nombre_formador'
  | 'observacion_general'
  | 'porcentaje_retencion'
  | 'porcentaje_produccion_individual'
  | 'porcentaje_produccion_grupal'
  | 'porcentaje_satisfaccion'
  | 'porcentaje_administrativo'
  | 'observacion_administrativa'
>;

const API_BASE_URL =
  getRuntimeEnv('VITE_API_BASE_URL') || (import.meta.env.PROD ? '' : 'http://localhost:8080');

const request = async <T>(path: string, options: RequestInit = {}) => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesión no disponible.');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'No se pudo procesar la evaluación.');
  return payload as T;
};

export const listTrainingVariableEvaluations = () =>
  request<{ evaluations: TrainingVariableEvaluation[] }>('/api/formacion/variables');

export const createTrainingVariableEvaluation = (payload: TrainingVariablePayload) =>
  request<{ evaluation: TrainingVariableEvaluation }>('/api/formacion/variables', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateTrainingVariableEvaluation = (id: string, payload: TrainingVariablePayload) =>
  request<{ evaluation: TrainingVariableEvaluation }>(`/api/formacion/variables/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export const closeTrainingVariableEvaluation = (id: string) =>
  request<{ evaluation: TrainingVariableEvaluation }>(`/api/formacion/variables/${id}/cerrar`, {
    method: 'POST',
  });

export const reopenTrainingVariableEvaluation = (id: string) =>
  request<{ evaluation: TrainingVariableEvaluation }>(`/api/formacion/variables/${id}/reabrir`, {
    method: 'POST',
  });

export const annulTrainingVariableEvaluation = (id: string) =>
  request<{ evaluation: TrainingVariableEvaluation }>(`/api/formacion/variables/${id}/anular`, {
    method: 'POST',
  });
