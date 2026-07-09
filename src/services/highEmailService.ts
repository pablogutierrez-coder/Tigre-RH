import { auth } from '../lib/firebase';
import { getRuntimeEnv } from '../lib/runtimeConfig';

const API_BASE_URL =
  getRuntimeEnv('VITE_API_BASE_URL') || (import.meta.env.PROD ? '' : 'http://localhost:8080');

export const sendHighsEmail = async (
  recipient: string,
  rows: Array<{
    dni: string;
    nombre: string;
    campana: string;
    capacitacion: string;
    fechaAlta: string;
  }>,
) => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) throw new Error('Sesion no disponible.');
  const response = await fetch(`${API_BASE_URL}/api/high-emails/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ recipient, rows }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || 'No se pudieron enviar las altas.');
  return data;
};
