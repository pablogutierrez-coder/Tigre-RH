import nodemailer from 'nodemailer';

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

const requiredSmtpVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];

const getTransporter = () => {
  const missing = requiredSmtpVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Faltan variables SMTP: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
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
}: SendSurveyInvitationsInput) => {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM!;
  const replyTo = process.env.SMTP_REPLY_TO || from;

  const results = [];
  for (const recipient of recipients) {
    const content = buildSurveyEmail(survey, recipient);
    const info = await transporter.sendMail({
      from,
      to: recipient.correo,
      replyTo,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });

    results.push({
      participant_id: recipient.participant_id,
      correo: recipient.correo,
      messageId: info.messageId,
    });
  }

  return results;
};
