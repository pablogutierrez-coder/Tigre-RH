import { Router, type Response } from 'express';
import { z } from 'zod';
import { adminDb } from '../firebaseAdmin.js';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
const canManageTraining = [
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Reclutador', 'Coordinador']),
];
const entitySchema = z.object({ id: z.string().min(1) }).passthrough();

const assertTrainingAccess = async (
  req: AuthenticatedRequest,
  sessionId: string,
) => {
  if (req.user!.rol !== 'Reclutador') return true;
  const session = await adminDb.collection('sessions').doc(sessionId).get();
  return session.exists && session.data()?.reclutador_id === req.user!.uid;
};

router.post('/', canManageTraining, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = z.object({
    session: entitySchema,
    survey: entitySchema,
    participants: z.array(entitySchema).max(2000),
    attendance: z.array(entitySchema).max(10000),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Datos de capacitacion invalidos.' });
    return;
  }

  const { session, survey, participants, attendance } = parsed.data;
  if (req.user!.rol === 'Reclutador') {
    session.reclutador_id = req.user!.uid;
    session.reclutador_nombre = req.user!.nombre;
  }

  const writer = adminDb.bulkWriter();
  writer.set(adminDb.collection('sessions').doc(session.id), session);
  writer.set(adminDb.collection('surveys').doc(survey.id), survey);
  participants.forEach((participant) =>
    writer.set(adminDb.collection('participants').doc(participant.id), participant),
  );
  attendance.forEach((record) =>
    writer.set(adminDb.collection('attendance').doc(record.id), record),
  );
  await writer.close();
  res.status(201).json({ ok: true });
});

router.patch('/:sessionId', canManageTraining, async (req: AuthenticatedRequest, res: Response) => {
  if (!(await assertTrainingAccess(req, req.params.sessionId))) {
    res.status(403).json({ message: 'Solo puedes editar tus propias capacitaciones.' });
    return;
  }
  const changes = z.record(z.string(), z.unknown()).safeParse(req.body);
  if (!changes.success) {
    res.status(400).json({ message: 'Cambios de capacitacion invalidos.' });
    return;
  }
  delete changes.data.id;
  if (req.user!.rol === 'Reclutador') {
    delete changes.data.reclutador_id;
    delete changes.data.reclutador_nombre;
  }
  await adminDb.collection('sessions').doc(req.params.sessionId).set(changes.data, { merge: true });
  res.json({ ok: true });
});

router.delete('/:sessionId', canManageTraining, async (req: AuthenticatedRequest, res: Response) => {
  const sessionId = req.params.sessionId;
  if (!(await assertTrainingAccess(req, sessionId))) {
    res.status(403).json({ message: 'Solo puedes eliminar tus propias capacitaciones.' });
    return;
  }

  const [
    participantsSnapshot,
    attendanceSnapshot,
    confirmationsSnapshot,
    surveysSnapshot,
  ] = await Promise.all([
    adminDb.collection('participants').where('training_session_id', '==', sessionId).get(),
    adminDb.collection('attendance').where('training_session_id', '==', sessionId).get(),
    adminDb.collection('confirmations').where('training_session_id', '==', sessionId).get(),
    adminDb.collection('surveys').where('training_session_id', '==', sessionId).get(),
  ]);

  const surveyIds = surveysSnapshot.docs.map((doc) => doc.id);
  const responseSnapshots = await Promise.all(
    surveyIds.map((surveyId) =>
      adminDb.collection('responses').where('training_survey_id', '==', surveyId).get(),
    ),
  );

  const writer = adminDb.bulkWriter();
  writer.delete(adminDb.collection('sessions').doc(sessionId));
  participantsSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
  attendanceSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
  confirmationsSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
  surveysSnapshot.docs.forEach((doc) => writer.delete(doc.ref));
  responseSnapshots.forEach((snapshot) =>
    snapshot.docs.forEach((doc) => writer.delete(doc.ref)),
  );
  await writer.close();

  res.json({ ok: true });
});

router.post(
  '/:sessionId/participants',
  canManageTraining,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!(await assertTrainingAccess(req, req.params.sessionId))) {
      res.status(403).json({ message: 'Solo puedes cargar personas en tus propias capacitaciones.' });
      return;
    }
    const parsed = z.object({
      participants: z.array(entitySchema).min(1).max(2000),
      attendance: z.array(entitySchema).max(10000),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos de participantes invalidos.' });
      return;
    }
    const writer = adminDb.bulkWriter();
    parsed.data.participants.forEach((participant) =>
      writer.set(adminDb.collection('participants').doc(participant.id), participant),
    );
    parsed.data.attendance.forEach((record) =>
      writer.set(adminDb.collection('attendance').doc(record.id), record),
    );
    await writer.close();
    res.status(201).json({ ok: true, added: parsed.data.participants.length });
  },
);

export { router as trainingRoutes };
