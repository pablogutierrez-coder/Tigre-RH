import { adminDb } from '../firebaseAdmin.js';

type StoredRecord = Record<string, unknown> & { id: string };

export interface TrainingVariableSource {
  id: string;
  codigo: string;
  campana: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface AutomaticTrainingVariableResult {
  generation_ids: string[];
  codigos_generacion: string[];
  porcentaje_retencion: number;
  porcentaje_produccion_individual: number;
  porcentaje_produccion_grupal: number;
  porcentaje_satisfaccion: number;
  detalle: {
    participantes_dia_1: number;
    participantes_dia_final: number;
    prospectos_generados: number;
    prospectos_venta_alta: number;
    respuestas_encuesta: number;
  };
}

const ACTIVE_ATTENDANCE = new Set(['Asistió', 'Tardanza', 'Descanso médico', 'Feriado']);
const roundPercent = (value: number) => Math.round(value * 100) / 100;
const normalizeText = (value: unknown) => String(value || '').trim();
const normalizeIds = (value: unknown) => Array.isArray(value)
  ? value.map(normalizeText).filter(Boolean)
  : [];

const isAssignedTrainer = (session: StoredRecord, trainerId: string) => {
  const assignedIds = new Set([
    normalizeText(session.formador_id),
    ...normalizeIds(session.formador_ids),
  ].filter(Boolean));
  return assignedIds.has(trainerId);
};

const isInPeriod = (session: StoredRecord, year: number, month: number) => {
  const startDate = normalizeText(session.fecha_inicio);
  const match = /^(\d{4})-(\d{2})-/.exec(startDate);
  return Boolean(match && Number(match[1]) === year && Number(match[2]) === month);
};

const sourceFromSession = (session: StoredRecord): TrainingVariableSource => ({
  id: session.id,
  codigo: normalizeText(session.generation_code || session.nombre_generacion || session.id),
  campana: normalizeText(session.campana || session['campaña']),
  fecha_inicio: normalizeText(session.fecha_inicio),
  fecha_fin: normalizeText(session.fecha_fin),
});

const readCollection = async (name: string) => {
  const snapshot = await adminDb.collection(name).get();
  return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }) as StoredRecord);
};

export const listTrainingVariableSources = async (
  trainerId: string,
  year: number,
  month: number,
) => {
  const sessions = await readCollection('sessions');
  return sessions
    .filter((session) => isAssignedTrainer(session, trainerId) && isInPeriod(session, year, month))
    .map(sourceFromSession)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio) || a.codigo.localeCompare(b.codigo));
};

const attendanceStatus = (
  participant: StoredRecord,
  recordsByParticipantAndDay: Map<string, string>,
  day: number,
) => recordsByParticipantAndDay.get(`${participant.id}:${day}`)
  || normalizeText(participant[`asistencia_dia_${day}`]);

const responseScorePercent = (response: StoredRecord) => {
  const finalScore = Number(response.final_score_20);
  if (Number.isFinite(finalScore)) return Math.max(0, Math.min(100, finalScore * 5));

  const average = Number(response.promedio_individual);
  if (Number.isFinite(average)) return Math.max(0, Math.min(100, average * 20));

  const questionValues = Array.from({ length: 10 }, (_, index) => Number(response[`q${index + 1}`]))
    .filter(Number.isFinite);
  if (!questionValues.length) return null;
  return Math.max(0, Math.min(100, (questionValues.reduce((sum, value) => sum + value, 0) / questionValues.length) * 20));
};

export const calculateTrainingVariableFromSources = async (
  trainerId: string,
  generationIds: string[],
  year: number,
  month: number,
): Promise<AutomaticTrainingVariableResult> => {
  const selectedIds = Array.from(new Set(generationIds.map(normalizeText).filter(Boolean)));
  if (!selectedIds.length) throw new Error('Selecciona al menos un código de generación.');

  const [sessions, participants, attendance, prospects, surveys, responses] = await Promise.all([
    readCollection('sessions'),
    readCollection('participants'),
    readCollection('attendance'),
    readCollection('prospects'),
    readCollection('surveys'),
    readCollection('responses'),
  ]);

  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  const selectedSessions = selectedIds.map((id) => sessionById.get(id));
  if (selectedSessions.some((session) => !session)) throw new Error('Uno de los códigos seleccionados ya no existe.');

  const validSessions = selectedSessions as StoredRecord[];
  if (validSessions.some((session) => !isAssignedTrainer(session, trainerId))) {
    throw new Error('Uno de los códigos seleccionados no corresponde al formador.');
  }
  if (validSessions.some((session) => !isInPeriod(session, year, month))) {
    throw new Error('Uno de los códigos seleccionados no corresponde al periodo indicado.');
  }

  const selectedIdSet = new Set(selectedIds);
  const selectedCodes = validSessions.map((session) => sourceFromSession(session).codigo);
  const selectedParticipants = participants.filter((participant) => selectedIdSet.has(normalizeText(participant.training_session_id)));
  const selectedAttendance = attendance.filter((record) => selectedIdSet.has(normalizeText(record.training_session_id)));
  const recordsByParticipantAndDay = new Map<string, string>();
  selectedAttendance.forEach((record) => {
    recordsByParticipantAndDay.set(`${normalizeText(record.participant_id)}:${Number(record.dia)}`, normalizeText(record.estado_asistencia));
  });

  let dayOneCount = 0;
  let finalDayCount = 0;
  selectedParticipants.forEach((participant) => {
    const session = sessionById.get(normalizeText(participant.training_session_id));
    const finalDay = Number(session?.training_days) === 10 ? 10 : 5;
    const attendedDayOne = ACTIVE_ATTENDANCE.has(attendanceStatus(participant, recordsByParticipantAndDay, 1));
    if (!attendedDayOne) return;

    dayOneCount += 1;
    if (ACTIVE_ATTENDANCE.has(attendanceStatus(participant, recordsByParticipantAndDay, finalDay))) {
      finalDayCount += 1;
    }
  });
  const retention = dayOneCount > 0 ? (finalDayCount / dayOneCount) * 100 : 0;

  const selectedProspects = prospects.filter((prospect) => {
    const sessionId = normalizeText(prospect.training_session_id);
    const sessionCode = normalizeText(prospect.training_session_code);
    return selectedIdSet.has(sessionId) || selectedCodes.includes(sessionCode);
  });
  const soldProspects = selectedProspects.filter((prospect) => normalizeText(prospect.estado) === 'Venta / Alta');
  const production = selectedProspects.length > 0 ? (soldProspects.length / selectedProspects.length) * 100 : 0;

  const selectedSurveyIds = new Set(
    surveys
      .filter((survey) => selectedIdSet.has(normalizeText(survey.training_session_id)) || selectedCodes.includes(normalizeText(survey.codigo_generacion)))
      .map((survey) => survey.id),
  );
  const selectedResponses = responses.filter((response) =>
    selectedSurveyIds.has(normalizeText(response.training_survey_id))
    || selectedCodes.includes(normalizeText(response.codigo_generacion)),
  );
  const satisfactionScores = selectedResponses
    .map(responseScorePercent)
    .filter((value): value is number => value !== null);
  const satisfaction = satisfactionScores.length > 0
    ? satisfactionScores.reduce((sum, value) => sum + value, 0) / satisfactionScores.length
    : 0;

  return {
    generation_ids: selectedIds,
    codigos_generacion: selectedCodes,
    porcentaje_retencion: roundPercent(retention),
    porcentaje_produccion_individual: roundPercent(production),
    porcentaje_produccion_grupal: roundPercent(production),
    porcentaje_satisfaccion: roundPercent(satisfaction),
    detalle: {
      participantes_dia_1: dayOneCount,
      participantes_dia_final: finalDayCount,
      prospectos_generados: selectedProspects.length,
      prospectos_venta_alta: soldProspects.length,
      respuestas_encuesta: satisfactionScores.length,
    },
  };
};
