import { Router, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { adminDb, adminRealtimeDb, adminStorage } from '../firebaseAdmin.js';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
const recordSchema = z.object({ id: z.string().min(1), training_session_id: z.string().min(1) }).passthrough();
const cvUploadSchema = z.object({
  training_session_id: z.string().min(1),
  file_name: z.string().min(1).max(180),
  content_type: z.string().min(1).max(140),
  base64: z.string().min(1),
});

const cvContentTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const cvAllowedRoles = ['Administrador', 'Analista', 'Reclutador', 'Coordinador'];
const cvViewerRoles = ['Administrador', 'Analista', 'Reclutador', 'Coordinador', 'Formador'];

const safeFileName = (fileName: string) =>
  fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 160);

const safePathSegment = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase()
    .slice(0, 100) || 'POSTULANTE';

const isAllowedCvFile = (fileName: string, contentType: string) =>
  cvContentTypes.has(contentType) || /\.(pdf|doc|docx)$/i.test(fileName);

const getStorageBucketCandidates = (preferredBucket?: string) => {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  return Array.from(new Set([
    preferredBucket,
    process.env.VITE_FIREBASE_STORAGE_BUCKET,
    projectId ? `${projectId}.firebasestorage.app` : undefined,
    process.env.FIREBASE_STORAGE_BUCKET,
    projectId ? `${projectId}.appspot.com` : undefined,
  ].filter((bucket): bucket is string => Boolean(bucket))));
};

const saveCvInAvailableBucket = async (
  path: string,
  buffer: Buffer,
  contentType: string,
  metadata: Record<string, string>,
) => {
  const candidates = getStorageBucketCandidates();
  if (!candidates.length) {
    throw new Error('Firebase Storage no esta configurado en el backend.');
  }

  let lastError: unknown;
  for (const bucketName of candidates) {
    try {
      await adminStorage.bucket(bucketName).file(path).save(buffer, {
        resumable: false,
        contentType,
        metadata: { metadata },
      });
      return bucketName;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (!message.includes('bucket') || !message.includes('does not exist')) throw error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No se encontro un bucket de Firebase Storage disponible.');
};

const ownsSession = async (req: AuthenticatedRequest, sessionId: string) => {
  const session = await adminDb.collection('sessions').doc(sessionId).get();
  if (!session.exists) return false;
  if (req.user!.rol === 'Formador') return session.data()?.formador_id === req.user!.uid;
  if (req.user!.rol === 'Reclutador') {
    const data = session.data();
    return data?.reclutador_id === req.user!.uid ||
      (Array.isArray(data?.reclutador_ids) && data.reclutador_ids.includes(req.user!.uid));
  }
  return true;
};

const canAccessParticipant = async (req: AuthenticatedRequest, participantId: string) => {
  const participantDoc = await adminDb.collection('participants').doc(participantId).get();
  if (!participantDoc.exists) return null;
  const participant = { id: participantDoc.id, ...participantDoc.data() } as Record<string, unknown>;
  const sessionId = String(participant.training_session_id || '');
  if (!sessionId || !(await ownsSession(req, sessionId))) return null;
  return { participantDoc, participant, sessionId };
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

router.post(
  '/participants/:id/cv',
  requireAuth,
  requireRole(cvAllowedRoles),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = cvUploadSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ message: 'Datos del CV invalidos.' });
        return;
      }

    const access = await canAccessParticipant(req, req.params.id);
    if (!access || access.sessionId !== parsed.data.training_session_id) {
      res.status(403).json({ message: 'No puedes cargar CV para este participante.' });
      return;
    }
    if (!isAllowedCvFile(parsed.data.file_name, parsed.data.content_type)) {
      res.status(400).json({ message: 'Formato no permitido. Sube un archivo PDF, DOC o DOCX.' });
      return;
    }

    const buffer = Buffer.from(parsed.data.base64, 'base64');
    const maxSizeBytes = 10 * 1024 * 1024;
    if (!buffer.length || buffer.length > maxSizeBytes) {
      res.status(400).json({ message: 'El CV supera el tamaño máximo permitido de 10 MB.' });
      return;
    }

    const recordId = randomUUID();
    const participantName = [access.participant.nombres, access.participant.apellidos]
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .join(' ');
    const path = `cv/${safePathSegment(participantName || req.params.id)}/${recordId}/${safeFileName(parsed.data.file_name)}`;
    const bucketName = await saveCvInAvailableBucket(path, buffer, parsed.data.content_type, {
      participantId: req.params.id,
      trainingSessionId: access.sessionId,
      uploadedBy: req.user!.uid,
    });

    const uploadedAt = new Date().toISOString();
    const fileAccessUrl = `/api/operations/participants/${req.params.id}/cv-url`;
    const cvRecord = {
      id: recordId,
      userId: req.user!.uid,
      postulanteId: req.params.id,
      nombrePostulante: participantName,
      cvFile: {
        id: recordId,
        name: parsed.data.file_name,
        mimeType: parsed.data.content_type,
        size: buffer.length,
        storageProvider: 'firebase_storage',
        storagePath: path,
        bucket: bucketName,
        url: fileAccessUrl,
        publicUrl: fileAccessUrl,
        downloadUrl: fileAccessUrl,
        previewUrl: fileAccessUrl,
        uploadedAt,
        uploadedBy: req.user!.uid,
      },
      createdAt: uploadedAt,
      updatedAt: uploadedAt,
    };

    try {
      await adminRealtimeDb.ref().update({
        [`shared/cv_records_v1/${recordId}`]: cvRecord,
        [`shared/cv_record_${recordId}`]: cvRecord,
      });
    } catch (error) {
      await adminStorage.bucket(bucketName).file(path).delete({ ignoreNotFound: true }).catch(() => undefined);
      throw new Error(`No se pudo guardar la metadata del CV en Realtime Database: ${error instanceof Error ? error.message : 'error desconocido'}`);
    }

    const nextParticipant = {
      ...access.participant,
      cv_record_id: recordId,
      cv_file_name: parsed.data.file_name,
      cv_file_path: path,
      cv_bucket: bucketName,
      cv_content_type: parsed.data.content_type,
      cv_file_size: buffer.length,
      cv_uploaded_at: uploadedAt,
      cv_uploaded_by: req.user!.uid,
    };
    try {
      await access.participantDoc.ref.set(nextParticipant, { merge: true });
    } catch (error) {
      await Promise.allSettled([
        adminStorage.bucket(bucketName).file(path).delete({ ignoreNotFound: true }),
        adminRealtimeDb.ref().update({
          [`shared/cv_records_v1/${recordId}`]: null,
          [`shared/cv_record_${recordId}`]: null,
        }),
      ]);
      throw error;
    }
    res.json({ ok: true, participant: nextParticipant });
    } catch (error) {
      console.error('Error uploading participant CV:', error);
      const errorMessage = error instanceof Error ? error.message : '';
      const storageIsMissing = errorMessage.toLowerCase().includes('bucket does not exist');
      res.status(500).json({
        message: storageIsMissing
          ? `No se pudo guardar el CV en Firebase Storage: ${errorMessage}.`
          : error instanceof Error
          ? errorMessage.startsWith('No se pudo guardar la metadata')
            ? errorMessage
            : `No se pudo guardar el CV en Firebase Storage: ${errorMessage}.`
          : 'No se pudo guardar el CV en Firebase Storage: error desconocido.',
      });
    }
  },
);

router.get(
  '/participants/:id/cv-url',
  requireAuth,
  requireRole(cvViewerRoles),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
    const access = await canAccessParticipant(req, req.params.id);
    const cvPath = String(access?.participant.cv_file_path || '');
    if (!access || !cvPath) {
      res.status(404).json({ message: 'CV no encontrado.' });
      return;
    }

    const bucketCandidates = getStorageBucketCandidates(String(access.participant.cv_bucket || ''));
    if (!bucketCandidates.length) {
      res.status(500).json({ message: 'Firebase Storage no esta configurado en el backend.' });
      return;
    }

    let bucketName = bucketCandidates[0];
    for (const candidate of bucketCandidates) {
      const [exists] = await adminStorage.bucket(candidate).file(cvPath).exists();
      if (exists) {
        bucketName = candidate;
        break;
      }
    }

    const [url] = await adminStorage.bucket(bucketName).file(cvPath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    res.json({ url });
    } catch (error) {
      console.error('Error generating participant CV URL:', error);
      res.status(500).json({
        message: error instanceof Error
          ? `No se pudo abrir el CV: ${error.message}`
          : 'No se pudo abrir el CV.',
      });
    }
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
