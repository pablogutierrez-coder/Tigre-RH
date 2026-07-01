import { Router, type Response } from 'express';
import { z } from 'zod';
import { sendSurveyInvitations } from '../services/surveyEmailService.js';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
const canSendSurveyEmails = [
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Formador']),
];

const sendInvitationsSchema = z.object({
  survey: z.object({
    id: z.string().min(1),
    campana: z.string().min(1),
    codigo_generacion: z.string().min(1),
    formador_nombre: z.string().min(1),
  }),
  recipients: z
    .array(
      z.object({
        participant_id: z.string().min(1),
        nombre: z.string().min(1),
        dni: z.string().min(1),
        correo: z.string().email(),
        url: z.string().url(),
      }),
    )
    .min(1)
    .max(100),
});

router.post(
  '/send-invitations',
  canSendSurveyEmails,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = sendInvitationsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos de envio invalidos.' });
      return;
    }

    try {
      const sent = await sendSurveyInvitations({
        ...parsed.data,
        requestedBy: {
          uid: req.user!.uid,
          nombre: req.user!.nombre,
        },
      });

      res.json({ ok: true, sent });
    } catch (error) {
      console.error('Survey email send error:', error);
      const message = error instanceof Error ? error.message : 'Error interno.';
      res.status(message.startsWith('Faltan variables SMTP') ? 500 : 502).json({
        message,
      });
    }
  },
);

export { router as surveyEmailRoutes };
