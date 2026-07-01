import { auth } from '../lib/firebase';
import { getRuntimeEnv } from '../lib/runtimeConfig';

interface SurveyEmailRecipient {
  participant_id: string;
  nombre: string;
  dni: string;
  correo: string;
  url: string;
}

interface SurveyEmailInfo {
  id: string;
  campana: string;
  codigo_generacion: string;
  formador_nombre: string;
}

interface SendSurveyInvitationsInput {
  survey: SurveyEmailInfo;
  recipients: SurveyEmailRecipient[];
}

const API_BASE_URL =
  getRuntimeEnv('VITE_API_BASE_URL') || (import.meta.env.PROD ? '' : 'http://localhost:8080');

const getIdToken = async () => {
  const token = await auth?.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Sesion no disponible. Vuelve a iniciar sesion.');
  }

  return token;
};

export const sendSurveyInvitations = async (payload: SendSurveyInvitationsInput) => {
  const token = await getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/survey-emails/send-invitations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | { ok?: boolean; message?: string; sent?: unknown[] }
    | null;

  if (!response.ok) {
    throw new Error(data?.message || 'No se pudo enviar la encuesta por correo.');
  }

  return data;
};
