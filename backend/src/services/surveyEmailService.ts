import { adminDb } from '../firebaseAdmin.js';

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
  requestedBy: {
    uid: string;
    nombre: string;
  };
}

interface ResendEmailResponse {
  id?: string;
  message?: string;
  name?: string;
}

const requiredResendVars = ['RESEND_API_KEY'];

const getEmailFrom = () => process.env.EMAIL_FROM || process.env.FROM_EMAIL || '';
const getEmailReplyTo = () => process.env.EMAIL_REPLY_TO || process.env.FROM_EMAIL || getEmailFrom();

const validateResendConfig = () => {
  const missing = requiredResendVars.filter((key) => !process.env[key]);
  if (!getEmailFrom()) missing.push('EMAIL_FROM');
  if (missing.length > 0) {
    throw new Error(`Faltan variables Resend: ${missing.join(', ')}`);
  }
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildSurveyEmail = (survey: SurveyEmailInfo, recipient: SurveyEmailRecipient) => {
  const nombre = escapeHtml(recipient.nombre);
  const campana = escapeHtml(survey.campana);
  const generacion = escapeHtml(survey.codigo_generacion);
  const formador = escapeHtml(survey.formador_nombre);
  const url = escapeHtml(recipient.url);

  return {
    subject: `Encuesta de satisfaccion - ${generacion}`,
    text: [
      `Hola ${recipient.nombre},`,
      '',
      `Te invitamos a completar la encuesta de satisfaccion de la capacitacion ${survey.codigo_generacion}.`,
      `Campana: ${survey.campana}`,
      `Formador: ${survey.formador_nombre}`,
      '',
      `Ingresa aqui: ${recipient.url}`,
      '',
      'Gracias por ayudarnos a mejorar el proceso de formacion.',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin:0 0 12px;">Encuesta de satisfaccion</h2>
        <p>Hola <strong>${nombre}</strong>,</p>
        <p>Te invitamos a completar la encuesta de satisfaccion de tu capacitacion.</p>
        <ul>
          <li><strong>Campana:</strong> ${campana}</li>
          <li><strong>Generacion:</strong> ${generacion}</li>
          <li><strong>Formador:</strong> ${formador}</li>
        </ul>
        <p>
          <a href="${url}" style="background:#7c3aed;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            Responder encuesta
          </a>
        </p>
        <p style="font-size:12px;color:#64748b;">Si el boton no abre, copia este enlace en tu navegador:<br>${url}</p>
      </div>
    `,
  };
};

export const sendSurveyInvitations = async ({
  survey,
  recipients,
  requestedBy,
}: SendSurveyInvitationsInput) => {
  validateResendConfig();

  const results = [];
  for (const recipient of recipients) {
    const content = buildSurveyEmail(survey, recipient);
    const traceBase = {
      survey_id: survey.id,
      codigo_generacion: survey.codigo_generacion,
      participant_id: recipient.participant_id,
      destinatario: recipient.correo,
      tipo_correo: 'survey_invitation',
      provider: 'resend',
      requested_by_uid: requestedBy.uid,
      requested_by_nombre: requestedBy.nombre,
      fecha_envio: new Date().toISOString(),
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: getEmailFrom(),
          to: [recipient.correo],
          reply_to: getEmailReplyTo(),
          subject: content.subject,
          text: content.text,
          html: content.html,
        }),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));

      const data = (await response.json().catch(() => null)) as ResendEmailResponse | null;
      if (!response.ok) {
        const message = data?.message || data?.name || 'Resend no pudo enviar el correo.';
        throw new Error(message);
      }

      await saveEmailTrace({
        ...traceBase,
        estado_envio: 'enviado',
        message_id: data?.id || '',
      });

      results.push({
        participant_id: recipient.participant_id,
        correo: recipient.correo,
        messageId: data?.id || '',
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === 'AbortError'
          ? 'Timeout conectando con Resend.'
          : error instanceof Error
            ? error.message
            : 'No se pudo enviar el correo.';

      await saveEmailTrace({
        ...traceBase,
        estado_envio: 'error',
        error: message,
      });
      throw new Error(message);
    }
  }

  return results;
};

const saveEmailTrace = async (data: Record<string, unknown>) => {
  try {
    await adminDb.collection(process.env.EMAIL_TRACE_COLLECTION || 'correos_enviados').add(data);
  } catch (error) {
    console.error('Email trace save error:', error);
  }
};
