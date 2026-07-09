import { Router, type Response } from 'express';
import { z } from 'zod';
import { adminDb } from '../firebaseAdmin.js';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
const recordSchema = z.object({ id: z.string().min(1), training_session_id: z.string().min(1) }).passthrough();

const ownsSession = async (req: AuthenticatedRequest, sessionId: string) => {
  const session = await adminDb.collection('sessions').doc(sessionId).get();
  if (!session.exists) return false;
  if (req.user!.rol === 'Formador') return session.data()?.formador_id === req.user!.uid;
  if (req.user!.rol === 'Reclutador') return session.data()?.reclutador_id === req.user!.uid;
  return true;
};

router.put(
  '/attendance/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Formador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = recordSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success || !(await ownsSession(req, parsed.data.training_session_id))) {
      res.status(403).json({ message: 'No puedes modificar esta asistencia.' });
      return;
    }
    await adminDb.collection('attendance').doc(req.params.id).set(parsed.data, { merge: true });
    res.json({ ok: true });
  },
);

router.put(
  '/confirmations/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Formador', 'Reclutador', 'Coordinador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = recordSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success || !(await ownsSession(req, parsed.data.training_session_id))) {
      res.status(403).json({ message: 'No puedes modificar esta alta.' });
      return;
    }
    await adminDb.collection('confirmations').doc(req.params.id).set(parsed.data, { merge: true });
    res.json({ ok: true });
  },
);

router.put(
  '/participants/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Formador', 'Reclutador', 'Coordinador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = recordSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success || !(await ownsSession(req, parsed.data.training_session_id))) {
      res.status(403).json({ message: 'No puedes modificar este participante.' });
      return;
    }
    await adminDb.collection('participants').doc(req.params.id).set(parsed.data, { merge: true });
    res.json({ ok: true });
  },
);

export { router as operationRoutes };
