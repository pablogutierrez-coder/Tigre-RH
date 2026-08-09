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
    if (req.user!.rol === 'Formador') {
      delete parsed.data.cv_file_name;
      delete parsed.data.cv_file_path;
      delete parsed.data.cv_content_type;
      delete parsed.data.cv_uploaded_at;
      delete parsed.data.cv_uploaded_by;
    }
    await adminDb.collection('participants').doc(req.params.id).set(parsed.data, { merge: true });
    res.json({ ok: true });
  },
);

router.delete(
  '/participants/:id',
  requireAuth,
  requireRole(['Administrador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const participantDoc = await adminDb.collection('participants').doc(req.params.id).get();
    if (!participantDoc.exists) {
      res.status(404).json({ message: 'Postulante no encontrado.' });
      return;
    }

    const [
      attendanceSnapshot,
      confirmationsSnapshot,
      responsesSnapshot,
    ] = await Promise.all([
      adminDb.collection('attendance').where('participant_id', '==', req.params.id).get(),
      adminDb.collection('confirmations').where('participant_id', '==', req.params.id).get(),
      adminDb.collection('responses').where('participant_id', '==', req.params.id).get(),
    ]);

    const writer = adminDb.bulkWriter();
    writer.delete(participantDoc.ref);
    attendanceSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
    confirmationsSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
    responsesSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
    await writer.close();

    res.json({
      ok: true,
      deleted: {
        participant: 1,
        attendance: attendanceSnapshot.size,
        confirmations: confirmationsSnapshot.size,
        responses: responsesSnapshot.size,
      },
    });
  },
);

router.put(
  '/reopens/:id',
  requireAuth,
  requireRole(['Administrador', 'Formador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = recordSchema.safeParse({ ...req.body, id: req.params.id });
    if (!parsed.success || !(await ownsSession(req, parsed.data.training_session_id))) {
      res.status(403).json({ message: 'No puedes modificar esta solicitud de reapertura.' });
      return;
    }

    if (
      req.user!.rol === 'Formador' &&
      (parsed.data.formador_id !== req.user!.uid || parsed.data.estado !== 'pendiente')
    ) {
      res.status(403).json({ message: 'Solo puedes crear solicitudes pendientes propias.' });
      return;
    }

    await adminDb.collection('reopens').doc(req.params.id).set(parsed.data, { merge: true });
    res.json({ ok: true });
  },
);

export { router as operationRoutes };
