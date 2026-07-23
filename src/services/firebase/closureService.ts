import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import type {
  AttendanceRecord,
  AuditLog,
  Participant,
  SurveyResponse,
  TrainingClosure,
  TrainingSession,
  TrainingSurvey,
} from '../../types';
import { createAuditLog } from './auditLogService';
import { createDocumentWithId, updateDocument } from './firestoreHelpers';
import { isSurveyEligibleParticipant } from '../../utils/trainingProgress';

interface ValidateClosureParams {
  session: TrainingSession;
  participants: Participant[];
  attendance: AttendanceRecord[];
  surveys: TrainingSurvey[];
  responses: SurveyResponse[];
}

interface CloseTrainingParams extends ValidateClosureParams {
  closedBy: string;
  closedByName?: string;
  observation?: string;
}

const VALID_ATTENDANCE = ['Asistió', 'Tardanza', 'Faltó', 'Desistió'];
const CLOSED_READY_STATES = ['En curso', 'Activa', 'Campaña cerrada'];

const isFinishedByDate = (session: TrainingSession) => {
  const endDate = new Date(`${session.fecha_fin}T23:59:59`);
  return Number.isNaN(endDate.getTime()) ? false : endDate <= new Date();
};

const getSessionParticipants = (
  session: TrainingSession,
  participants: Participant[],
) =>
  participants.filter(
    (participant) => participant.training_session_id === session.id,
  );

const isDeserted = (
  participant: Participant,
  attendance: AttendanceRecord[],
) =>
  participant.estado_final === 'Desistió' ||
  attendance.some(
    (record) =>
      record.participant_id === participant.id &&
      record.estado_asistencia === 'Desistió',
  );

const hasValidAttendance = (
  participant: Participant,
  attendance: AttendanceRecord[],
) => {
  const records = attendance.filter(
    (record) => record.participant_id === participant.id,
  );
  if (isDeserted(participant, records)) return true;

  return [1, 2, 3, 4, 5].every((day) =>
    VALID_ATTENDANCE.includes(
      records.find((record) => record.dia === day)?.estado_asistencia || '',
    ),
  );
};

const hasValidOutcome = (participant: Participant) =>
  participant.resultado_formacion === 'Apto' ||
  participant.resultado_formacion === 'No apto';

const hasValidDesertionReason = (
  participant: Participant,
  attendance: AttendanceRecord[],
) => {
  if (!isDeserted(participant, attendance)) return true;

  const desertionRecord = attendance.find(
    (record) =>
      record.participant_id === participant.id &&
      record.estado_asistencia === 'Desistió',
  );

  const motive = participant.motivo_desercion || desertionRecord?.motivo_desercion;
  const observation = participant.observacion_general || desertionRecord?.observacion;
  return !!motive?.trim() && !!observation?.trim();
};

const hasSurveyResponse = (
  participant: Participant,
  relatedSurveys: TrainingSurvey[],
  responses: SurveyResponse[],
) => {
  if (relatedSurveys.length === 0) return true;
  const relatedSurveyIds = new Set(relatedSurveys.map((survey) => survey.id));
  return responses.some(
    (response) =>
      response.participant_id === participant.id &&
      relatedSurveyIds.has(response.training_survey_id),
  );
};

export const validateClosureRequirements = ({
  session,
  participants,
  attendance,
  surveys,
  responses,
}: ValidateClosureParams) => {
  const errors: string[] = [];
  const sessionParticipants = getSessionParticipants(session, participants);
  const sessionAttendance = attendance.filter(
    (record) => record.training_session_id === session.id,
  );
  const relatedSurveys = surveys.filter(
    (survey) =>
      survey.training_session_id === session.id &&
      (survey.estado === 'Habilitada' || survey.estado === 'Cerrada'),
  );

  const sessionFinished =
    isFinishedByDate(session) || CLOSED_READY_STATES.includes(session.estado);
  const attendanceComplete = sessionParticipants.every((participant) =>
    hasValidAttendance(participant, sessionAttendance),
  );
  const participantOutcomeComplete = sessionParticipants.every((participant) =>
    isDeserted(participant, sessionAttendance) || hasValidOutcome(participant),
  );
  const desertionReasonsComplete = sessionParticipants.every((participant) =>
    hasValidDesertionReason(participant, sessionAttendance),
  );
  const surveyEligibleParticipants = sessionParticipants.filter((participant) =>
    isSurveyEligibleParticipant(participant, sessionAttendance),
  );
  const surveyComplete = surveyEligibleParticipants.every((participant) =>
    hasSurveyResponse(participant, relatedSurveys, responses),
  );

  if (!sessionFinished) {
    errors.push('La capacitación aún no ha terminado o no está apta para cierre.');
  }
  if (!attendanceComplete) {
    errors.push(
      'Todos los participantes deben tener asistencia válida. Seleccionar y Pendiente no cuentan.',
    );
  }
  if (!participantOutcomeComplete) {
    errors.push('Todos los participantes deben tener resultado Apto o No apto.');
  }
  if (!desertionReasonsComplete) {
    errors.push('Los participantes desistidos deben tener motivo y observación.');
  }
  if (!surveyComplete) {
    errors.push(
      'Los participantes aptos con asistencia valida deben responder la encuesta asociada antes del cierre.',
    );
  }

  return {
    canClose:
      sessionFinished &&
      attendanceComplete &&
      participantOutcomeComplete &&
      desertionReasonsComplete &&
      surveyComplete,
    errors,
    validations: {
      sessionFinished,
      attendanceComplete,
      participantOutcomeComplete,
      surveyComplete,
    },
  };
};

export const closeTraining = async ({
  closedBy,
  closedByName,
  observation,
  ...validationParams
}: CloseTrainingParams) => {
  const validation = validateClosureRequirements(validationParams);
  if (!validation.canClose) return validation;

  const now = new Date().toISOString();
  await updateDocument<TrainingSession>(
    FDR_COLLECTIONS.sessions,
    validationParams.session.id,
    { estado: 'Capacitación cerrada' },
  );

  const closure: TrainingClosure = {
    id: `closure-${validationParams.session.id}`,
    training_session_id: validationParams.session.id,
    closed_by: closedBy,
    closed_by_name: closedByName,
    closed_at: now,
    observation,
    validations: validation.validations,
    status: 'closed',
  };

  await createDocumentWithId(
    FDR_COLLECTIONS.trainingClosures,
    closure.id,
    closure,
  );

  const log: AuditLog = {
    id: `log-close-${validationParams.session.id}-${Date.now()}`,
    usuario_id: closedBy,
    usuario_nombre: closedByName || closedBy,
    rol: 'Administrador',
    accion: 'Cierre de capacitación',
    modulo: 'Cierre de capacitaciones',
    detalle: `Se cerró la capacitación "${validationParams.session.nombre_generacion}".`,
    fecha: now,
    campaña: validationParams.session.campaña,
    generacion: validationParams.session.nombre_generacion,
    comentario: observation,
  };
  await createAuditLog(log);

  return validation;
};
