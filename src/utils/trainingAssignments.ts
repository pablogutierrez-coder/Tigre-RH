import type { TrainingSession } from '../types';

export const getSessionTrainerIds = (session: Pick<TrainingSession, 'formador_id' | 'formador_ids'>) =>
  Array.from(new Set([
    ...(Array.isArray(session.formador_ids) ? session.formador_ids : []),
    session.formador_id,
  ].filter(Boolean)));

export const getSessionTrainerNames = (
  session: Pick<TrainingSession, 'formador_nombre' | 'formador_nombres'>,
) => Array.from(new Set([
  ...(Array.isArray(session.formador_nombres) ? session.formador_nombres : []),
  session.formador_nombre,
].filter(Boolean)));

export const isSessionAssignedTrainer = (
  session: Pick<TrainingSession, 'formador_id' | 'formador_ids'>,
  userId?: string,
) => Boolean(userId && getSessionTrainerIds(session).includes(userId));
