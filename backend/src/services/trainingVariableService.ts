import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin.js';
import { calculateTrainingVariableEvaluation } from './trainingVariableCalculator.js';

export type TrainingVariableStatus = 'BORRADOR' | 'CERRADO' | 'REABIERTO' | 'ANULADO';

export interface TrainingVariableInput {
  anio: number;
  mes: number;
  id_formador: string;
  nombre_formador: string;
  observacion_general?: string;
  porcentaje_retencion: number;
  porcentaje_produccion_individual: number;
  porcentaje_produccion_grupal: number;
  porcentaje_satisfaccion: number;
  porcentaje_administrativo: number;
  observacion_administrativa?: string;
}

export interface TrainingVariableEvaluation extends TrainingVariableInput {
  id: string;
  id_coordinador: string;
  nombre_coordinador: string;
  fecha_creacion: string;
  fecha_modificacion: string;
  fecha_cierre?: string;
  estado: TrainingVariableStatus;
  cumplimiento_retencion: number;
  aporte_retencion: number;
  aporte_produccion: number;
  cumplimiento_satisfaccion: number;
  aporte_satisfaccion: number;
  aporte_administrativo: number;
  cumplimiento_total: number;
  comision_base: number;
  bloques_sobrecumplimiento: number;
  bono_sobrecumplimiento: number;
  comision_total: number;
  usuario_creacion: string;
  usuario_modificacion: string;
}

export interface Actor {
  uid: string;
  rol: string;
  nombre: string;
}

const COLLECTION = 'evaluacion_variable_formacion';
const HISTORY_COLLECTION = 'evaluacion_variable_formacion_historial';
const ACTIVE_STATES: TrainingVariableStatus[] = ['BORRADOR', 'CERRADO', 'REABIERTO'];

const nowIso = () => new Date().toISOString();
const canManage = (actor: Actor) => ['Administrador', 'Coordinador'].includes(actor.rol);

const assertPeriod = (input: TrainingVariableInput) => {
  if (!Number.isInteger(input.anio) || input.anio < 2020 || input.anio > 2100) {
    throw new Error('El año es obligatorio y debe ser válido.');
  }
  if (!Number.isInteger(input.mes) || input.mes < 1 || input.mes > 12) {
    throw new Error('El mes es obligatorio y debe estar entre 1 y 12.');
  }
  if (!input.id_formador.trim() || !input.nombre_formador.trim()) {
    throw new Error('El formador es obligatorio.');
  }
};

const getEvaluation = async (id: string) => {
  const doc = await adminDb.collection(COLLECTION).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as TrainingVariableEvaluation) : null;
};

export const getTrainingVariableEvaluationById = async (id: string, actor: Actor) => {
  const evaluation = await getEvaluation(id);
  if (!evaluation) throw new Error('Evaluación no encontrada.');
  if (actor.rol === 'Formador') {
    if (evaluation.id_formador === actor.uid && evaluation.estado === 'CERRADO') return evaluation;
    throw new Error('No tienes permisos para consultar esta evaluación.');
  }
  if (['Administrador', 'Coordinador'].includes(actor.rol)) return evaluation;
  throw new Error('No tienes permisos para consultar evaluaciones.');
};

const assertNoDuplicate = async (input: TrainingVariableInput, currentId?: string) => {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('id_formador', '==', input.id_formador)
    .get();

  const duplicate = snapshot.docs.some((doc) => {
    if (doc.id === currentId) return false;
    const data = doc.data();
    return data.anio === input.anio && data.mes === input.mes && ACTIVE_STATES.includes(data.estado);
  });

  if (duplicate) {
    throw new Error('Ya existe una evaluación activa para ese formador y periodo.');
  }
};

const writeHistory = async (
  evaluationId: string,
  action: string,
  actor: Actor,
  detail?: string,
) => {
  const id = `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await adminDb.collection(HISTORY_COLLECTION).doc(id).set({
    id,
    evaluation_id: evaluationId,
    action,
    user_id: actor.uid,
    user_name: actor.nombre,
    user_role: actor.rol,
    detail: detail || '',
    created_at: nowIso(),
  });
};

export const listTrainingVariableEvaluations = async (actor: Actor) => {
  const snapshot = await adminDb.collection(COLLECTION).get();
  const evaluations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as TrainingVariableEvaluation));

  if (actor.rol === 'Formador') {
    return evaluations
      .filter((evaluation) => evaluation.id_formador === actor.uid && evaluation.estado === 'CERRADO')
      .sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  }

  if (['Administrador', 'Coordinador'].includes(actor.rol)) {
    return evaluations.sort((a, b) => b.anio - a.anio || b.mes - a.mes);
  }

  return [];
};

export const createTrainingVariableEvaluation = async (
  input: TrainingVariableInput,
  actor: Actor,
) => {
  if (!canManage(actor)) throw new Error('No tienes permisos para crear evaluaciones.');
  assertPeriod(input);
  await assertNoDuplicate(input);

  const id = `var-form-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = nowIso();
  const calculated = calculateTrainingVariableEvaluation(input);
  const evaluation: TrainingVariableEvaluation = {
    ...input,
    ...calculated,
    id,
    id_coordinador: actor.uid,
    nombre_coordinador: actor.nombre,
    fecha_creacion: timestamp,
    fecha_modificacion: timestamp,
    estado: 'BORRADOR',
    usuario_creacion: actor.uid,
    usuario_modificacion: actor.uid,
  };

  await adminDb.collection(COLLECTION).doc(id).set(evaluation);
  await writeHistory(id, 'CREAR', actor, 'Evaluación creada como borrador.');
  return evaluation;
};

export const updateTrainingVariableEvaluation = async (
  id: string,
  input: TrainingVariableInput,
  actor: Actor,
) => {
  if (!canManage(actor)) throw new Error('No tienes permisos para editar evaluaciones.');
  const current = await getEvaluation(id);
  if (!current) throw new Error('Evaluación no encontrada.');
  if (current.estado === 'CERRADO') throw new Error('No se puede editar una evaluación cerrada.');
  if (current.estado === 'ANULADO') throw new Error('No se puede editar una evaluación anulada.');
  assertPeriod(input);
  await assertNoDuplicate(input, id);

  const calculated = calculateTrainingVariableEvaluation(input);
  const changes = {
    ...input,
    ...calculated,
    fecha_modificacion: nowIso(),
    usuario_modificacion: actor.uid,
  };

  await adminDb.collection(COLLECTION).doc(id).set(changes, { merge: true });
  await writeHistory(id, 'EDITAR', actor, 'Evaluación actualizada.');
  return { ...current, ...changes } as TrainingVariableEvaluation;
};

export const closeTrainingVariableEvaluation = async (id: string, actor: Actor) => {
  if (!canManage(actor)) throw new Error('No tienes permisos para cerrar evaluaciones.');
  const current = await getEvaluation(id);
  if (!current) throw new Error('Evaluación no encontrada.');
  if (current.estado === 'CERRADO') throw new Error('La evaluación ya está cerrada.');
  if (current.estado === 'ANULADO') throw new Error('No se puede cerrar una evaluación anulada.');
  calculateTrainingVariableEvaluation(current);

  const changes = {
    estado: 'CERRADO' as TrainingVariableStatus,
    fecha_cierre: nowIso(),
    fecha_modificacion: nowIso(),
    usuario_modificacion: actor.uid,
  };
  await adminDb.collection(COLLECTION).doc(id).set(changes, { merge: true });
  await writeHistory(id, 'CERRAR', actor, 'Evaluación cerrada.');
  return { ...current, ...changes };
};

export const reopenTrainingVariableEvaluation = async (id: string, actor: Actor) => {
  if (actor.rol !== 'Administrador') throw new Error('Solo el administrador puede reabrir evaluaciones.');
  const current = await getEvaluation(id);
  if (!current) throw new Error('Evaluación no encontrada.');
  if (current.estado !== 'CERRADO') throw new Error('Solo se pueden reabrir evaluaciones cerradas.');

  const changes = {
    estado: 'REABIERTO' as TrainingVariableStatus,
    fecha_modificacion: nowIso(),
    usuario_modificacion: actor.uid,
  };
  await adminDb.collection(COLLECTION).doc(id).set({ ...changes, fecha_cierre: FieldValue.delete() }, { merge: true });
  await writeHistory(id, 'REABRIR', actor, 'Evaluación reabierta.');
  return { ...current, ...changes, fecha_cierre: undefined };
};

export const annulTrainingVariableEvaluation = async (id: string, actor: Actor) => {
  if (actor.rol !== 'Administrador') throw new Error('Solo el administrador puede anular evaluaciones.');
  const current = await getEvaluation(id);
  if (!current) throw new Error('Evaluación no encontrada.');
  if (current.estado === 'ANULADO') throw new Error('La evaluación ya está anulada.');

  const changes = {
    estado: 'ANULADO' as TrainingVariableStatus,
    fecha_modificacion: nowIso(),
    usuario_modificacion: actor.uid,
  };
  await adminDb.collection(COLLECTION).doc(id).set(changes, { merge: true });
  await writeHistory(id, 'ANULAR', actor, 'Evaluación anulada.');
  return { ...current, ...changes };
};
