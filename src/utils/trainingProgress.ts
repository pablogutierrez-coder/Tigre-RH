import type { AttendanceRecord, Participant } from '../types';

const PRESENT_ATTENDANCE = new Set(['Asistio', 'Asisti�', 'Asistió', 'Tardanza']);
const DESERTION_ATTENDANCE = new Set(['Desisti�', 'Desistió', 'Baja']);
const DESERTION_FINAL_STATES = new Set(['Desisti�', 'Desistió', 'No asisti�', 'No asistió']);
const SURVEY_READY_FINAL_STATES = new Set([
  'Complet� capacitaci�n',
  'Completó capacitación',
  'Pendiente de alta',
  'Alta confirmada',
]);

export const REQUIRED_TRAINING_DAYS = 5;
export const REQUIRED_SURVEY_ATTENDANCE_PERCENT = 80;

export const getPresentAttendanceDays = (
  participantId: string,
  attendance: AttendanceRecord[],
) =>
  new Set(
    attendance
      .filter(
        (record) =>
          record.participant_id === participantId &&
          PRESENT_ATTENDANCE.has(record.estado_asistencia),
      )
      .map((record) => record.dia),
  ).size;

export const getTrainingAttendancePercent = (
  participantId: string,
  attendance: AttendanceRecord[],
) =>
  Math.round(
    (getPresentAttendanceDays(participantId, attendance) / REQUIRED_TRAINING_DAYS) *
      100,
  );

export const hasTrainingDropout = (
  participant: Participant,
  attendance: AttendanceRecord[],
) =>
  DESERTION_FINAL_STATES.has(participant.estado_final) ||
  attendance.some(
    (record) =>
      record.participant_id === participant.id &&
      DESERTION_ATTENDANCE.has(record.estado_asistencia),
  );

export const isSurveyEligibleParticipant = (
  participant: Participant,
  attendance: AttendanceRecord[],
) => {
  if (hasTrainingDropout(participant, attendance)) return false;

  const hasApprovedOutcome =
    participant.resultado_formacion === 'Apto' ||
    SURVEY_READY_FINAL_STATES.has(participant.estado_final);

  return (
    hasApprovedOutcome &&
    getTrainingAttendancePercent(participant.id, attendance) >=
      REQUIRED_SURVEY_ATTENDANCE_PERCENT
  );
};
