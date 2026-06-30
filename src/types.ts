/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'Administrador' | 'Analista' | 'Reclutador' | 'Formador' | 'Coordinador' | 'Sistemas';

export interface User {
  id: string;
  nombre: string;
  correo: string;
  usuario: string;
  usuario_normalizado?: string;
  password?: string;
  rol: UserRole;
  estado: 'Activo' | 'Inactivo';
  fecha_creacion: string;
  creado_por?: string;
  requiere_cambio_password?: boolean;
}

export interface Campaign {
  id: string;
  nombre: string;
  estado: 'Activo' | 'Inactivo';
}

export interface TrainingSession {
  id: string;
  nombre_generacion: string;
  campaña: string; // e.g. 'Entel Empresas', 'Prosegur', 'Culqi', 'Equifax'
  tipo_capacitacion: string; // e.g. 'Capacitación regular', 'Capacitación flash', etc.
  fecha_inicio: string;
  fecha_fin: string;
  formador_id: string; // User ID of the trainer
  formador_nombre: string;
  reclutador_id: string; // User ID of the recruiter
  reclutador_nombre: string;
  modalidad: 'Presencial' | 'Virtual' | 'Híbrida';
  turno: 'Part time' | 'Full time' | 'Mini full';
  hora_capacitacion?: string; // 24-hour format, e.g. '08:00'
  observaciones?: string;
  estado: 'Pendiente de inicio' | 'En curso' | 'Activa' | 'Campaña cerrada' | 'Capacitación cerrada';
  fecha_creacion: string;
  generation_code?: string;
}

export interface Participant {
  id: string;
  training_session_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  celular: string;
  correo: string;
  puesto: string;
  fuente_reclutamiento: string;
  observacion?: string;
  estado_final: 'Completó capacitación' | 'Desistió' | 'No asistió' | 'En riesgo' | 'Pendiente de alta' | 'Alta confirmada' | 'Pendiente de gestión';
  
  // Real Excel fields
  reclutador_origen?: string;
  coordinador?: string;
  ciudad?: string;
  sueldo?: string;
  estado_pruebas_psicologicas?: string;
  fecha_entrevista_sup?: string;
  resultado_entrevista_sup?: string;
  fecha_capacitacion?: string;
  formador_asignado?: string;

  // Daily attendance state & observation directly on participant
  asistencia_dia_1?: AttendanceStatus;
  observacion_dia_1?: string;
  asistencia_dia_2?: AttendanceStatus;
  observacion_dia_2?: string;
  asistencia_dia_3?: AttendanceStatus;
  observacion_dia_3?: string;
  asistencia_dia_4?: AttendanceStatus;
  observacion_dia_4?: string;
  asistencia_dia_5?: AttendanceStatus;
  observacion_dia_5?: string;
  
  // Deserción and high states
  motivo_desercion?: string;
  observacion_general?: string;
  estado_alta?: 'Alta confirmada' | 'Pendiente de alta' | 'No alta';
  _rowId?: string;

  // Resultado de formación
  resultado_formacion?: 'Marcar' | 'Apto' | 'No apto';
  comentario_aptitud?: string;
  motivo_no_apt?: string;
}

export type AttendanceStatus = 'Seleccionar' | 'Asistió' | 'Tardanza' | 'Faltó' | 'Desistió' | 'Pendiente';

export interface AttendanceRecord {
  id: string;
  participant_id: string;
  training_session_id: string;
  dia: number; // 1, 2, 3, 4, 5
  fecha: string; // YYYY-MM-DD
  estado_asistencia: AttendanceStatus;
  minutos_tardanza?: number; // Optional
  motivo_desercion?: string; // Optional (if Desistió)
  observacion?: string;
  registrado_por: string; // User ID
  fecha_registro: string;
}

export type AltaStatus = 'Alta confirmada' | 'Pendiente de alta' | 'No alta' | 'Eliminada';

export interface OperationConfirmation {
  id: string;
  participant_id: string;
  training_session_id: string;
  estado_alta: AltaStatus;
  fecha_alta?: string; // YYYY-MM-DD
  motivo_no_alta?: string; // Required if 'No alta'
  observacion?: string;
  registrado_por: string; // User ID
  fecha_registro: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface UploadHistory {
  id: string;
  training_session_id: string;
  nombre_archivo: string;
  total_registros: number;
  registros_validos: number;
  registros_error: number;
  cargado_por: string; // User ID or username
  fecha_carga: string;
}

export type ReopenRequestStatus = 'pendiente' | 'aprobada' | 'rechazada' | 'vencida';

export interface AttendanceReopenRequest {
  id: string;
  training_session_id: string;
  formador_id: string;
  formador_nombre: string;
  campaña: string;
  generacion: string;
  fecha_capacitacion: string;
  dia_capacitacion: number; // 1 to 5
  motivo: string;
  comentario?: string;
  estado: ReopenRequestStatus;
  aprobado_por?: string; // Admin User ID or name
  fecha_solicitud: string;
  fecha_respuesta?: string;
  comentario_respuesta?: string;
  habilitado_hasta?: string; // ISO String or YYYY-MM-DD HH:mm:ss
}

export interface AuditLog {
  id: string;
  usuario_id: string;
  usuario_nombre: string;
  rol: UserRole;
  accion: string;
  modulo: string;
  detalle: string;
  fecha: string; // ISO String
  campaña?: string;
  generacion?: string;
  participante_id?: string;
  participante_nombre?: string;
  valor_anterior?: string;
  valor_nuevo?: string;
  comentario?: string;
}

export type SurveyStatus = 'Borrador' | 'Habilitada' | 'Deshabilitada' | 'Cerrada' | 'Eliminada';

export interface TrainingSurvey {
  id: string;
  training_session_id: string;
  codigo_generacion: string;
  campaña: string;
  formador_id: string;
  formador_nombre: string;
  estado: SurveyStatus;
  token: string;
  fecha_habilitacion?: string;
  fecha_cierre?: string;
  
  // extra fields from requirement 17
  training_type?: string;
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at?: string;
  enabled_at?: string;
  disabled_at?: string;
  closed_at?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface SurveyResponse {
  id: string;
  training_survey_id: string;
  participant_id: string;
  dni: string;
  nombre_ejecutivo: string;
  campaña: string;
  codigo_generacion: string;
  formador_id: string;
  formador_nombre: string;
  fecha_respuesta: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  total_score: number;
  final_score_20: number;
  classification: 'Excelente' | 'Bueno' | 'Regular' | 'Crítico';
  
  // for backwards compatibility with initial seed data
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  p5?: number;
  p6?: number;
  p7?: number;
  p8?: number;
  promedio_individual?: number;
  comentario_positivo?: string;
  aspecto_mejora?: string;
}

export interface TrainingClosure {
  id: string;
  training_session_id: string;
  closed_by: string;
  closed_by_name?: string;
  closed_at: string;
  observation?: string;
  validations: Record<string, unknown>;
  status: 'closed';
}
