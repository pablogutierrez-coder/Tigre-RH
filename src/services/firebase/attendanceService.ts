import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { AttendanceRecord, AttendanceStatus, Participant } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
} from './firestoreHelpers';

const VALID_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Asistió',
  'Tardanza',
  'Faltó',
  'Desistió',
];

export const NEUTRAL_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  'Seleccionar',
  'Pendiente',
];

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getAttendance = () =>
  getCollectionDocuments<AttendanceRecord>(FDR_COLLECTIONS.attendance);

export const getAttendanceBySession = async (sessionId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.attendance),
    where('training_session_id', '==', sessionId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AttendanceRecord);
};

export const getAttendanceByParticipant = async (participantId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.attendance),
    where('participant_id', '==', participantId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as AttendanceRecord);
};

export const saveAttendance = (record: AttendanceRecord) =>
  createDocumentWithId(FDR_COLLECTIONS.attendance, record.id, {
    ...record,
    estado_asistencia: record.estado_asistencia || 'Seleccionar',
  });

export const saveBulkAttendance = (records: AttendanceRecord[]) =>
  Promise.all(records.map((record) => saveAttendance(record)));

export const isValidAttendanceStatus = (status?: AttendanceStatus) =>
  !!status && VALID_ATTENDANCE_STATUSES.includes(status);

export const validateAttendanceComplete = (
  sessionId: string,
  participants: Participant[],
  attendance: AttendanceRecord[] = [],
) => {
  const sessionParticipants = participants.filter(
    (participant) => participant.training_session_id === sessionId,
  );

  return sessionParticipants.every((participant) => {
    const records = attendance.filter(
      (record) =>
        record.training_session_id === sessionId &&
        record.participant_id === participant.id,
    );

    const hasDesertion = records.some(
      (record) => record.estado_asistencia === 'Desistió',
    );
    if (hasDesertion) return true;

    return [1, 2, 3, 4, 5].every((day) =>
      isValidAttendanceStatus(
        records.find((record) => record.dia === day)?.estado_asistencia,
      ),
    );
  });
};

export const getAttendanceSummary = async (sessionId: string) => {
  const records = await getAttendanceBySession(sessionId);
  return records.reduce(
    (summary, record) => {
      if (record.estado_asistencia === 'Asistió') summary.asistio += 1;
      if (record.estado_asistencia === 'Tardanza') summary.tardanza += 1;
      if (record.estado_asistencia === 'Faltó') summary.falto += 1;
      if (record.estado_asistencia === 'Desistió') summary.desistio += 1;
      return summary;
    },
    { asistio: 0, tardanza: 0, falto: 0, desistio: 0 },
  );
};
