import type { TrainingSession } from '../types';
import { getTrainingDaysCount } from './trainingDays';

export type TrainingTemporalStatus = 'proxima' | 'en_curso' | 'finalizada';

const parseDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const getTrainingTemporalStatus = (
  session: TrainingSession,
  referenceDate = new Date(),
): TrainingTemporalStatus => {
  const start = parseDate(session.fecha_inicio);
  const end = parseDate(session.fecha_fin);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  if (start && today < start) return 'proxima';
  if (end && today > end) return 'finalizada';
  return 'en_curso';
};

export const getTrainingCurrentDay = (session: TrainingSession, referenceDate = new Date()) => {
  const totalDays = getTrainingDaysCount(session);
  const status = getTrainingTemporalStatus(session, referenceDate);
  if (status === 'proxima') return 0;
  if (status === 'finalizada') return totalDays;

  const start = parseDate(session.fecha_inicio);
  if (!start) return 1;
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const elapsed = Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.min(elapsed, totalDays));
};

export const getSessionActivityMonths = (session: TrainingSession) => {
  const start = parseDate(session.fecha_inicio);
  const end = parseDate(session.fecha_fin) || start;
  if (!start || !end) return [];

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  const months: string[] = [];
  while (cursor <= last) {
    months.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

export const sessionHasActivityInMonth = (session: TrainingSession, month: string) =>
  !month || getSessionActivityMonths(session).includes(month);

export const formatTrainingDate = (value?: string) => {
  const date = parseDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' })
    .format(date)
    .replace('.', '');
};

