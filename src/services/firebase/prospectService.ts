import { auth } from '../../lib/firebase';
import { getRuntimeEnv } from '../../lib/runtimeConfig';
import type { Prospect } from '../../types';

const API_BASE_URL =
  getRuntimeEnv('VITE_API_BASE_URL') || (import.meta.env.PROD ? '' : 'http://localhost:8080');

const request = async <T>(path: string, options: RequestInit = {}) => {
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
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'No se pudo procesar el prospecto.');
  return payload as T;
};

type ProspectInput = Omit<Prospect, 'id' | 'creado_por' | 'creado_por_rol' | 'created_at' | 'updated_at'>;

export const listProspects = async () =>
  (await request<{ prospects: Prospect[] }>('/api/prospects')).prospects;

export const createProspect = (prospect: ProspectInput) =>
  request<{ prospect: Prospect }>('/api/prospects', {
    method: 'POST',
    body: JSON.stringify(prospect),
  });

export const updateProspect = (id: string, prospect: ProspectInput) =>
  request<{ prospect: Prospect }>(`/api/prospects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(prospect),
  });

export const deleteProspect = (id: string) =>
  request<void>(`/api/prospects/${id}`, { method: 'DELETE' });
