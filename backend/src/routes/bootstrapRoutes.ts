import { Router, type Response } from 'express';
import { adminDb } from '../firebaseAdmin.js';
import {
  type AuthenticatedRequest,
  requireAuth,
} from '../utils/authMiddleware.js';

const router = Router();

const readCollection = async (name: string) => {
  const snapshot = await adminDb.collection(name).get();
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Array<Record<string, unknown>>;
};

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const canSeeAllSessions = [
      'Administrador',
      'Analista',
      'Coordinador',
      'Sistemas',
      'Reclutador',
    ].includes(user.rol);

    const [
      allUsers,
      allSessions,
      allParticipants,
      allAttendance,
      allConfirmations,
      allReopens,
      allLogs,
      allSurveys,
      allResponses,
    ] = await Promise.all([
      readCollection('users'),
      readCollection('sessions'),
      readCollection('participants'),
      readCollection('attendance'),
      readCollection('confirmations'),
      readCollection('reopens'),
      readCollection('logs'),
      readCollection('surveys'),
      readCollection('responses'),
    ]);

    const sessions = canSeeAllSessions
      ? allSessions
      : allSessions.filter((session) =>
          user.rol === 'Formador'
            ? session.formador_id === user.uid
            : session.reclutador_id === user.uid,
        );
    const sessionIds = new Set(sessions.map((session) => String(session.id)));
    const participants = allParticipants.filter((participant) =>
      sessionIds.has(String(participant.training_session_id)),
    );
    const participantIds = new Set(
      participants.map((participant) => String(participant.id)),
    );
    const surveys = allSurveys.filter((survey) =>
      sessionIds.has(String(survey.training_session_id)),
    );
    const surveyIds = new Set(surveys.map((survey) => String(survey.id)));

    res.json({
      users:
        user.rol === 'Administrador' || user.rol === 'Analista'
          ? allUsers
          : allUsers.filter(
              (profile) =>
                profile.id === user.uid ||
                ['Coordinador', 'Formador', 'Reclutador'].includes(String(profile.rol)),
            ),
      sessions,
      participants,
      attendance: allAttendance.filter(
        (record) =>
          sessionIds.has(String(record.training_session_id)) ||
          participantIds.has(String(record.participant_id)),
      ),
      confirmations: allConfirmations.filter((record) =>
        sessionIds.has(String(record.training_session_id)),
      ),
      reopens: allReopens.filter((record) =>
        sessionIds.has(String(record.training_session_id)),
      ),
      logs: ['Administrador', 'Coordinador', 'Sistemas'].includes(user.rol)
        ? allLogs
        : [],
      surveys,
      responses: allResponses.filter((response) =>
        surveyIds.has(String(response.training_survey_id)),
      ),
    });
  } catch (error) {
    console.error('Bootstrap load error:', error);
    res.status(500).json({ message: 'No se pudieron cargar los datos de la plataforma.' });
  }
});

export { router as bootstrapRoutes };
