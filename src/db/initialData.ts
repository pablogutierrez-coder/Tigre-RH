/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, Campaign, TrainingSession, Participant, AttendanceRecord, OperationConfirmation, AttendanceReopenRequest, AuditLog, TrainingSurvey, SurveyResponse } from '../types';

// Helper to generate IDs
const genId = () => Math.random().toString(36).substring(2, 11);

// Standard Users list
export const INITIAL_USERS: User[] = [
  {
    id: 'u-alicia',
    nombre: 'Alicia Cleque',
    correo: 'alicia.cleque@automatizate.pe',
    usuario: 'Alicia.Cleque',
    rol: 'Administrador',
    estado: 'Activo',
    fecha_creacion: '2026-06-28T09:00:00Z'
  },
  {
    id: 'u-victor',
    nombre: 'Víctor Reynoso',
    correo: 'victor.reynoso@automatizate.pe',
    usuario: 'victor.reynoso',
    rol: 'Formador',
    estado: 'Activo',
    fecha_creacion: '2026-06-28T09:05:00Z'
  },
  {
    id: 'u-paloma',
    nombre: 'Paloma Chamillo',
    correo: 'paloma.chamillo@automatizate.pe',
    usuario: 'paloma.chamillo',
    rol: 'Formador',
    estado: 'Activo',
    fecha_creacion: '2026-06-28T09:10:00Z'
  },
  {
    id: 'u-oscar',
    nombre: 'Oscar Vildoso',
    correo: 'oscar.vildoso@automatizate.pe',
    usuario: 'oscar.vildoso',
    rol: 'Formador',
    estado: 'Activo',
    fecha_creacion: '2026-06-28T09:15:00Z'
  },
  {
    id: 'u-1',
    nombre: 'Diana Silva (Administrador - Inactivo)',
    correo: 'admin@automatizate.pe',
    usuario: 'admin',
    rol: 'Administrador',
    estado: 'Inactivo',
    fecha_creacion: '2026-05-01T09:00:00Z'
  },
  {
    id: 'u-2',
    nombre: 'Laura Mendoza (Reclutamiento - Inactivo)',
    correo: 'laura.mendoza@automatizate.pe',
    usuario: 'reclutador',
    rol: 'Reclutador',
    estado: 'Inactivo',
    fecha_creacion: '2026-05-01T09:10:00Z'
  },
  {
    id: 'u-3',
    nombre: 'Carlos Peralta (FDR Formador - Inactivo)',
    correo: 'carlos.peralta@automatizate.pe',
    usuario: 'formador',
    rol: 'Formador',
    estado: 'Inactivo',
    fecha_creacion: '2026-05-01T09:15:00Z'
  },
  {
    id: 'u-4',
    nombre: 'Viviana Rojas (FDR Formador - Inactivo)',
    correo: 'viviana.rojas@automatizate.pe',
    usuario: 'vivi_formador',
    rol: 'Formador',
    estado: 'Inactivo',
    fecha_creacion: '2026-05-10T10:00:00Z'
  },
  {
    id: 'u-5',
    nombre: 'Eduardo Ortiz (Reclutamiento - Inactivo)',
    correo: 'eduardo.ortiz@automatizate.pe',
    usuario: 'edu_reclutador',
    rol: 'Reclutador',
    estado: 'Inactivo',
    fecha_creacion: '2026-05-12T11:00:00Z'
  }
];

// Campaigns list
export const INITIAL_CAMPAIGNS: Campaign[] = [
  { id: 'c-1', nombre: 'Entel Empresas', estado: 'Activo' },
  { id: 'c-2', nombre: 'Prosegur', estado: 'Activo' },
  { id: 'c-3', nombre: 'Culqi', estado: 'Activo' }
];

// Active/Completed Training Sessions
export const INITIAL_SESSIONS: TrainingSession[] = [
  {
    id: 's-1',
    nombre_generacion: 'Generación 1 Entel Empresas',
    campaña: 'Entel Empresas',
    tipo_capacitacion: 'Capacitación regular',
    fecha_inicio: '2026-06-15',
    fecha_fin: '2026-06-19',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    reclutador_id: 'u-alicia',
    reclutador_nombre: 'Alicia Cleque',
    modalidad: 'Presencial',
    turno: 'Full time',
    hora_capacitacion: '08:00',
    observaciones: 'Grupo enfocado en ventas corporativas de telecomunicaciones.',
    estado: 'Activa',
    fecha_creacion: '2026-06-10T14:30:00Z',
    generation_code: 'GR-01 ENTEL'
  },
  {
    id: 's-2',
    nombre_generacion: 'Generación 1 Culqi',
    campaña: 'Culqi',
    tipo_capacitacion: 'Capacitación regular',
    fecha_inicio: '2026-06-25',
    fecha_fin: '2026-06-29',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    reclutador_id: 'u-alicia',
    reclutador_nombre: 'Alicia Cleque',
    modalidad: 'Virtual',
    turno: 'Part time',
    hora_capacitacion: '09:00',
    observaciones: 'Capacitación sobre pasarela de pagos para PYMEs.',
    estado: 'En curso',
    fecha_creacion: '2026-06-22T10:15:00Z',
    generation_code: 'GR-01 CULQI'
  },
  {
    id: 's-3',
    nombre_generacion: 'Generación 1 Prosegur',
    campaña: 'Prosegur',
    tipo_capacitacion: 'Capacitación regular',
    fecha_inicio: '2026-06-26',
    fecha_fin: '2026-06-30',
    formador_id: 'u-paloma',
    formador_nombre: 'Paloma Chamillo',
    reclutador_id: 'u-alicia',
    reclutador_nombre: 'Alicia Cleque',
    modalidad: 'Presencial',
    turno: 'Mini full',
    hora_capacitacion: '14:30',
    observaciones: 'Entrenamiento rápido de alarmas residenciales.',
    estado: 'En curso',
    fecha_creacion: '2026-06-24T16:00:00Z',
    generation_code: 'GR-01 PROSEGUR'
  },
  {
    id: 's-4',
    nombre_generacion: 'Generación Especial GPON Culqi',
    campaña: 'Culqi',
    tipo_capacitacion: 'Capacitación express',
    fecha_inicio: '2026-07-02',
    fecha_fin: '2026-07-06',
    formador_id: 'u-oscar',
    formador_nombre: 'Oscar Vildoso',
    reclutador_id: 'u-alicia',
    reclutador_nombre: 'Alicia Cleque',
    modalidad: 'Híbrida',
    turno: 'Part time',
    hora_capacitacion: '08:00',
    observaciones: 'Pendiente de inicio. Carga temprana de participantes para validación.',
    estado: 'Pendiente de inicio',
    fecha_creacion: '2026-06-27T09:20:00Z',
    generation_code: 'GR-02 CULQI'
  }
];

// Participants
export const INITIAL_PARTICIPANTS: Participant[] = [
  // Session 1: Generación 1 Entel Empresas (Completed) - 8 participants
  { id: 'p-101', training_session_id: 's-1', dni: '45871254', nombres: 'Juan Carlos', apellidos: 'Gómez Prado', celular: '987452145', correo: 'juan.gomez@gmail.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Computrabajo', estado_final: 'Alta confirmada' },
  { id: 'p-102', training_session_id: 's-1', dni: '72548123', nombres: 'Andrea Belén', apellidos: 'Soto Ramos', celular: '951236478', correo: 'andrea.soto@outlook.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Indeed', estado_final: 'Alta confirmada' },
  { id: 'p-103', training_session_id: 's-1', dni: '48512364', nombres: 'Marlon Jesús', apellidos: 'Campos Díaz', celular: '965478123', correo: 'marlon.campos@gmail.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Referido', estado_final: 'Alta confirmada' },
  { id: 'p-104', training_session_id: 's-1', dni: '70215487', nombres: 'Sofía Carolina', apellidos: 'Linares Flores', celular: '998541236', correo: 'sofia.linares@gmail.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Facebook Ads', estado_final: 'Alta confirmada' },
  { id: 'p-105', training_session_id: 's-1', dni: '12458796', nombres: 'Ricardo David', apellidos: 'Vargas Ortiz', celular: '954781263', correo: 'ricardo.vargas@gmail.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Computrabajo', estado_final: 'Desistió' },
  { id: 'p-106', training_session_id: 's-1', dni: '32145698', nombres: 'Estefany Maribel', apellidos: 'Huamán Quispe', celular: '921478563', correo: 'estefany.huaman@hotmail.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Indeed', estado_final: 'Completó capacitación' }, // Pendiente de Alta
  { id: 'p-107', training_session_id: 's-1', dni: '65478912', nombres: 'Christian Omar', apellidos: 'Alva Benítez', celular: '936547812', correo: 'christian.alva@outlook.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Computrabajo', estado_final: 'Desistió' },
  { id: 'p-108', training_session_id: 's-1', dni: '78912345', nombres: 'Milagros Lucía', apellidos: 'Paredes Santillán', celular: '912345678', correo: 'milagros.paredes@gmail.com', puesto: 'Asesor de Ventas', fuente_reclutamiento: 'Referido', estado_final: 'No asistió' },

  // Session 2: Generación 1 Culqi (En curso) - 7 participants
  { id: 'p-201', training_session_id: 's-2', dni: '74125896', nombres: 'Roberto Carlos', apellidos: 'Martínez Ruiz', celular: '984512369', correo: 'roberto.martinez@gmail.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'Computrabajo', estado_final: 'En riesgo' },
  { id: 'p-202', training_session_id: 's-2', dni: '42516398', nombres: 'Claudia Alexandra', apellidos: 'Peña Torres', celular: '974512368', correo: 'claudia.pena@gmail.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'Referido', estado_final: 'Pendiente de alta' },
  { id: 'p-203', training_session_id: 's-2', dni: '45821369', nombres: 'Diego Alonso', apellidos: 'Valenzuela Castro', celular: '965874123', correo: 'diego.valenzuela@outlook.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'Indeed', estado_final: 'Pendiente de alta' },
  { id: 'p-204', training_session_id: 's-2', dni: '78954123', nombres: 'Melisa Pierina', apellidos: 'Tello Mendoza', celular: '954123687', correo: 'melisa.tello@gmail.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'LinkedIn', estado_final: 'Desistió' },
  { id: 'p-205', training_session_id: 's-2', dni: '41236587', nombres: 'Jorge Enrique', apellidos: 'Salazar Carpio', celular: '932145876', correo: 'jorge.salazar@hotmail.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'Computrabajo', estado_final: 'Pendiente de alta' },
  { id: 'p-206', training_session_id: 's-2', dni: '10254879', nombres: 'Natalia Sofía', apellidos: 'Chávez Reyes', celular: '921548763', correo: 'natalia.chavez@gmail.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'Indeed', estado_final: 'Pendiente de alta' },
  { id: 'p-207', training_session_id: 's-2', dni: '45897123', nombres: 'Renzo Fabricio', apellidos: 'Maldonado Vega', celular: '935874126', correo: 'renzo.maldonado@gmail.com', puesto: 'Ejecutivo de Cuentas', fuente_reclutamiento: 'Facebook Ads', estado_final: 'Pendiente de alta' },

  // Session 3: Generación 1 Prosegur (En curso) - 6 participants
  { id: 'p-301', training_session_id: 's-3', dni: '47581236', nombres: 'Ángel David', apellidos: 'Guerrero León', celular: '981245789', correo: 'angel.guerrero@gmail.com', puesto: 'Asesor Técnico', fuente_reclutamiento: 'Computrabajo', estado_final: 'Pendiente de alta' },
  { id: 'p-302', training_session_id: 's-3', dni: '71548239', nombres: 'Lucía Fernanda', apellidos: 'Morales Gil', celular: '952361478', correo: 'lucia.morales@gmail.com', puesto: 'Asesor Técnico', fuente_reclutamiento: 'Indeed', estado_final: 'Pendiente de alta' },
  { id: 'p-303', training_session_id: 's-3', dni: '48951234', nombres: 'Mauricio Alexis', apellidos: 'Solís Cáceres', celular: '931254789', correo: 'mauricio.solis@outlook.com', puesto: 'Asesor Técnico', fuente_reclutamiento: 'Referido', estado_final: 'Desistió' },
  { id: 'p-304', training_session_id: 's-3', dni: '74125845', nombres: 'Karla Jimena', apellidos: 'Arrieta Palacios', celular: '945123678', correo: 'karla.arrieta@gmail.com', puesto: 'Asesor Técnico', fuente_reclutamiento: 'Facebook Ads', estado_final: 'Pendiente de alta' },
  { id: 'p-305', training_session_id: 's-3', dni: '15847239', nombres: 'Bruno Sebastián', apellidos: 'Rojas Cabrera', celular: '921245876', correo: 'bruno.rojas@gmail.com', puesto: 'Asesor Técnico', fuente_reclutamiento: 'Computrabajo', estado_final: 'Pendiente de alta' },
  { id: 'p-306', training_session_id: 's-3', dni: '33214568', nombres: 'Ximena Pilar', apellidos: 'Villarreal Espinoza', celular: '915478123', correo: 'ximena.villarreal@gmail.com', puesto: 'Asesor Técnico', fuente_reclutamiento: 'Indeed', estado_final: 'Pendiente de alta' },

  // Session 4: Capacitación de producto Equifax (Pendiente) - 5 participants
  { id: 'p-401', training_session_id: 's-4', dni: '45871239', nombres: 'Gonzalo Andrés', apellidos: 'Peralta Castro', celular: '984578123', correo: 'gonzalo.peralta@gmail.com', puesto: 'Analista de Riesgo', fuente_reclutamiento: 'LinkedIn', estado_final: 'Pendiente de alta' },
  { id: 'p-402', training_session_id: 's-4', dni: '75481236', nombres: 'Mariana Isabel', apellidos: 'Mendoza Luna', celular: '951248763', correo: 'mariana.mendoza@gmail.com', puesto: 'Analista de Riesgo', fuente_reclutamiento: 'Computrabajo', estado_final: 'Pendiente de alta' },
  { id: 'p-403', training_session_id: 's-4', dni: '48123456', nombres: 'Samuel Eliseo', apellidos: 'Zevallos Ortiz', celular: '931245876', correo: 'samuel.zevallos@outlook.com', puesto: 'Analista de Riesgo', fuente_reclutamiento: 'Indeed', estado_final: 'Pendiente de alta' },
  { id: 'p-404', training_session_id: 's-4', dni: '14253647', nombres: 'Valeria Nicole', apellidos: 'Cerrón Ramos', celular: '921457836', correo: 'valeria.cerron@gmail.com', puesto: 'Analista de Riesgo', fuente_reclutamiento: 'Facebook Ads', estado_final: 'Pendiente de alta' },
  { id: 'p-405', training_session_id: 's-4', dni: '32569841', nombres: 'Kevin Daniel', apellidos: 'Miranda Flores', celular: '912547836', correo: 'kevin.miranda@gmail.com', puesto: 'Analista de Riesgo', fuente_reclutamiento: 'Referido', estado_final: 'Pendiente de alta' }
];

// Attendance Records (Completed for s-1; partial for s-2 and s-3)
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  // Session 1: Completed. Day 1 to 5
  // p-101: Juan Carlos Gómez (Asistió 5 días)
  { id: genId(), participant_id: 'p-101', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-101', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-16T09:12:00Z' },
  { id: genId(), participant_id: 'p-101', training_session_id: 's-1', dia: 3, fecha: '2026-06-17', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-17T09:18:00Z' },
  { id: genId(), participant_id: 'p-101', training_session_id: 's-1', dia: 4, fecha: '2026-06-18', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-18T09:14:00Z' },
  { id: genId(), participant_id: 'p-101', training_session_id: 's-1', dia: 5, fecha: '2026-06-19', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-19T09:11:00Z' },

  // p-102: Andrea Belén Soto (Asistió with 1 Tardanza)
  { id: genId(), participant_id: 'p-102', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-102', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Tardanza', minutos_tardanza: 15, registrado_por: 'u-3', fecha_registro: '2026-06-16T09:13:00Z' },
  { id: genId(), participant_id: 'p-102', training_session_id: 's-1', dia: 3, fecha: '2026-06-17', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-17T09:18:00Z' },
  { id: genId(), participant_id: 'p-102', training_session_id: 's-1', dia: 4, fecha: '2026-06-18', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-18T09:14:00Z' },
  { id: genId(), participant_id: 'p-102', training_session_id: 's-1', dia: 5, fecha: '2026-06-19', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-19T09:11:00Z' },

  // p-103: Marlon Jesús Campos (Asistió 5 días)
  { id: genId(), participant_id: 'p-103', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-103', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-16T09:12:00Z' },
  { id: genId(), participant_id: 'p-103', training_session_id: 's-1', dia: 3, fecha: '2026-06-17', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-17T09:18:00Z' },
  { id: genId(), participant_id: 'p-103', training_session_id: 's-1', dia: 4, fecha: '2026-06-18', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-18T09:14:00Z' },
  { id: genId(), participant_id: 'p-103', training_session_id: 's-1', dia: 5, fecha: '2026-06-19', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-19T09:11:00Z' },

  // p-104: Sofía Carolina Linares (Asistió 5 días)
  { id: genId(), participant_id: 'p-104', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-104', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-16T09:12:00Z' },
  { id: genId(), participant_id: 'p-104', training_session_id: 's-1', dia: 3, fecha: '2026-06-17', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-17T09:18:00Z' },
  { id: genId(), participant_id: 'p-104', training_session_id: 's-1', dia: 4, fecha: '2026-06-18', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-18T09:14:00Z' },
  { id: genId(), participant_id: 'p-104', training_session_id: 's-1', dia: 5, fecha: '2026-06-19', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-19T09:11:00Z' },

  // p-105: Ricardo David Vargas (Desistió en Día 3)
  { id: genId(), participant_id: 'p-105', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-105', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-16T09:12:00Z' },
  { id: genId(), participant_id: 'p-105', training_session_id: 's-1', dia: 3, fecha: '2026-06-17', estado_asistencia: 'Desistió', motivo_desercion: 'No acepta condiciones', observacion: 'Sueldo variable no le pareció atractivo.', registrado_por: 'u-3', fecha_registro: '2026-06-17T09:20:00Z' },

  // p-106: Estefany Maribel Huamán (Asistió 5 días, sin alta)
  { id: genId(), participant_id: 'p-106', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-106', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-16T09:12:00Z' },
  { id: genId(), participant_id: 'p-106', training_session_id: 's-1', dia: 3, fecha: '2026-06-17', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-17T09:18:00Z' },
  { id: genId(), participant_id: 'p-106', training_session_id: 's-1', dia: 4, fecha: '2026-06-18', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-18T09:14:00Z' },
  { id: genId(), participant_id: 'p-106', training_session_id: 's-1', dia: 5, fecha: '2026-06-19', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-19T09:11:00Z' },

  // p-107: Christian Omar Alva (Desistió en Día 2)
  { id: genId(), participant_id: 'p-107', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },
  { id: genId(), participant_id: 'p-107', training_session_id: 's-1', dia: 2, fecha: '2026-06-16', estado_asistencia: 'Desistió', motivo_desercion: 'Problemas de horario', observacion: 'Se le cruza con sus clases universitarias.', registrado_por: 'u-3', fecha_registro: '2026-06-16T09:15:00Z' },

  // p-108: Milagros Lucía Paredes (Falta Día 1, no volvió)
  { id: genId(), participant_id: 'p-108', training_session_id: 's-1', dia: 1, fecha: '2026-06-15', estado_asistencia: 'Faltó', registrado_por: 'u-3', fecha_registro: '2026-06-15T09:15:00Z' },


  // Session 2: Culqi (En curso). Carlos Peralta
  // p-201: Roberto Carlos Martínez (Día 1: Asistió, Día 2: Faltó, Día 3: Asistió, Día 4: Tardanza, Día 5: Pendiente)
  { id: genId(), participant_id: 'p-201', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-201', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Faltó', registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-201', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-201', training_session_id: 's-2', dia: 4, fecha: '2026-06-28', estado_asistencia: 'Tardanza', minutos_tardanza: 25, registrado_por: 'u-3', fecha_registro: '2026-06-28T09:15:00Z' },

  // p-202: Claudia Alexandra Peña
  { id: genId(), participant_id: 'p-202', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-202', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-202', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-202', training_session_id: 's-2', dia: 4, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-28T09:15:00Z' },

  // p-203: Diego Alonso Valenzuela
  { id: genId(), participant_id: 'p-203', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-203', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-203', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-203', training_session_id: 's-2', dia: 4, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-28T09:15:00Z' },

  // p-204: Melisa Pierina Tello (Desistió Día 3)
  { id: genId(), participant_id: 'p-204', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-204', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-204', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Desistió', motivo_desercion: 'Problemas de salud', observacion: 'Presenta cuadro de faringitis aguda.', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:18:00Z' },

  // p-205: Jorge Enrique Salazar
  { id: genId(), participant_id: 'p-205', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-205', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-205', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-205', training_session_id: 's-2', dia: 4, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-28T09:15:00Z' },

  // p-206: Natalia Sofía Chávez
  { id: genId(), participant_id: 'p-206', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-206', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Tardanza', minutos_tardanza: 5, registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-206', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-206', training_session_id: 's-2', dia: 4, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-28T09:15:00Z' },

  // p-207: Renzo Fabricio Maldonado
  { id: genId(), participant_id: 'p-207', training_session_id: 's-2', dia: 1, fecha: '2026-06-25', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-25T09:10:00Z' },
  { id: genId(), participant_id: 'p-207', training_session_id: 's-2', dia: 2, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-26T09:11:00Z' },
  { id: genId(), participant_id: 'p-207', training_session_id: 's-2', dia: 3, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-207', training_session_id: 's-2', dia: 4, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-3', fecha_registro: '2026-06-28T09:15:00Z' },


  // Session 3: Prosegur (En curso). Viviana Rojas
  // p-301: Ángel David Guerrero
  { id: genId(), participant_id: 'p-301', training_session_id: 's-3', dia: 1, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-26T09:12:00Z' },
  { id: genId(), participant_id: 'p-301', training_session_id: 's-3', dia: 2, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-301', training_session_id: 's-3', dia: 3, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-28T09:25:00Z' },

  // p-302: Lucía Fernanda Morales
  { id: genId(), participant_id: 'p-302', training_session_id: 's-3', dia: 1, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-26T09:12:00Z' },
  { id: genId(), participant_id: 'p-302', training_session_id: 's-3', dia: 2, fecha: '2026-06-27', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-27T09:15:00Z' },
  { id: genId(), participant_id: 'p-302', training_session_id: 's-3', dia: 3, fecha: '2026-06-28', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-28T09:25:00Z' },

  // p-303: Mauricio Alexis Solís (Desistió Día 2)
  { id: genId(), participant_id: 'p-303', training_session_id: 's-3', dia: 1, fecha: '2026-06-26', estado_asistencia: 'Asistió', registrado_por: 'u-4', fecha_registro: '2026-06-26T09:12:00Z' },
  { id: genId(), participant_id: 'p-303', training_session_id: 's-3', dia: 2, fecha: '2026-06-27', estado_asistencia: 'Desistió', motivo_desercion: 'Otra propuesta laboral', observacion: 'Aceptó propuesta en call center más cercano a su domicilio.', registrado_por: 'u-4', fecha_registro: '2026-06-27T09:20:00Z' }
];

// Operation Confirmations (Only for completed Session 1)
export const INITIAL_CONFIRMATIONS: OperationConfirmation[] = [
  { id: genId(), participant_id: 'p-101', training_session_id: 's-1', estado_alta: 'Alta confirmada', fecha_alta: '2026-06-22', registrado_por: 'u-3', fecha_registro: '2026-06-22T08:30:00Z' },
  { id: genId(), participant_id: 'p-102', training_session_id: 's-1', estado_alta: 'Alta confirmada', fecha_alta: '2026-06-22', registrado_por: 'u-3', fecha_registro: '2026-06-22T08:32:00Z' },
  { id: genId(), participant_id: 'p-103', training_session_id: 's-1', estado_alta: 'Alta confirmada', fecha_alta: '2026-06-22', registrado_por: 'u-3', fecha_registro: '2026-06-22T08:35:00Z' },
  { id: genId(), participant_id: 'p-104', training_session_id: 's-1', estado_alta: 'Alta confirmada', fecha_alta: '2026-06-22', registrado_por: 'u-3', fecha_registro: '2026-06-22T08:36:00Z' },
  // p-106 is Pendiente de alta initially, or No alta:
  { id: genId(), participant_id: 'p-106', training_session_id: 's-1', estado_alta: 'Pendiente de alta', registrado_por: 'u-3', fecha_registro: '2026-06-22T08:40:00Z' }
];

// Reopen Requests
export const INITIAL_REOPEN_REQUESTS: AttendanceReopenRequest[] = [
  {
    id: 'req-1',
    training_session_id: 's-2',
    formador_id: 'u-3',
    formador_nombre: 'Carlos Peralta (FDR Formador)',
    campaña: 'Culqi',
    generacion: 'Generación 1 Culqi',
    fecha_capacitacion: '2026-06-28',
    dia_capacitacion: 4,
    motivo: 'Olvidé registrar asistencia en el horario establecido',
    comentario: 'Tuve problemas con mi conexión de red por la mañana.',
    estado: 'pendiente',
    fecha_solicitud: '2026-06-28T10:15:00Z'
  },
  {
    id: 'req-2',
    training_session_id: 's-3',
    formador_id: 'u-4',
    formador_nombre: 'Viviana Rojas (FDR Formador)',
    campaña: 'Prosegur',
    generacion: 'Generación 1 Prosegur',
    fecha_capacitacion: '2026-06-27',
    dia_capacitacion: 2,
    motivo: 'Se incorporaron participantes después del horario',
    comentario: 'Se agregaron dos personas enviadas de urgencia por Selección.',
    estado: 'aprobada',
    aprobado_por: 'Diana Silva (Administrador)',
    fecha_solicitud: '2026-06-27T09:45:00Z',
    fecha_respuesta: '2026-06-27T09:55:00Z',
    habilitado_hasta: '2026-06-27T23:59:59Z'
  }
];

// Audit Logs
export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    usuario_id: 'u-2',
    usuario_nombre: 'Laura Mendoza (Reclutamiento)',
    rol: 'Reclutador',
    accion: 'Creación de capacitación',
    modulo: 'Registro de capacitaciones',
    detalle: 'Se creó la capacitación Generación 1 Entel Empresas y se asignó a Carlos Peralta.',
    fecha: '2026-06-10T14:32:00Z',
    campaña: 'Entel Empresas',
    generacion: 'Generación 1 Entel Empresas'
  },
  {
    id: 'log-2',
    usuario_id: 'u-2',
    usuario_nombre: 'Laura Mendoza (Reclutamiento)',
    rol: 'Reclutador',
    accion: 'Carga de archivo de participantes',
    modulo: 'Carga de participantes',
    detalle: 'Se cargaron 8 participantes para Generación 1 Entel Empresas mediante excel_asistencias.xlsx.',
    fecha: '2026-06-10T14:35:00Z',
    campaña: 'Entel Empresas',
    generacion: 'Generación 1 Entel Empresas'
  },
  {
    id: 'log-3',
    usuario_id: 'u-3',
    usuario_nombre: 'Carlos Peralta (FDR Formador)',
    rol: 'Formador',
    accion: 'Marcado de asistencia',
    modulo: 'Control de asistencia',
    detalle: 'Se registró asistencia del Día 1 para Generación 1 Entel Empresas.',
    fecha: '2026-06-15T09:15:00Z',
    campaña: 'Entel Empresas',
    generacion: 'Generación 1 Entel Empresas'
  },
  {
    id: 'log-4',
    usuario_id: 'u-3',
    usuario_nombre: 'Carlos Peralta (FDR Formador)',
    rol: 'Formador',
    accion: 'Registro de deserción',
    modulo: 'Control de asistencia',
    detalle: 'Se registró deserción de Christian Omar Alva en el Día 2 por "Problemas de horario".',
    fecha: '2026-06-16T09:15:00Z',
    campaña: 'Entel Empresas',
    generacion: 'Generación 1 Entel Empresas',
    participante_id: 'p-107',
    participante_nombre: 'Christian Omar Alva Benítez'
  },
  {
    id: 'log-5',
    usuario_id: 'u-3',
    usuario_nombre: 'Carlos Peralta (FDR Formador)',
    rol: 'Formador',
    accion: 'Confirmación de alta',
    modulo: 'Confirmación de altas',
    detalle: 'Se confirmó el alta operativa de Juan Carlos Gómez Prado.',
    fecha: '2026-06-22T08:30:00Z',
    campaña: 'Entel Empresas',
    generacion: 'Generación 1 Entel Empresas',
    participante_id: 'p-101',
    participante_nombre: 'Juan Carlos Gómez Prado'
  }
];

// Initial satisfaction surveys
export const INITIAL_SURVEYS: TrainingSurvey[] = [
  {
    id: 'srv-1',
    training_session_id: 's-1',
    codigo_generacion: 'GR-01 ENTEL',
    campaña: 'Entel Empresas',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    estado: 'Habilitada',
    token: 'GR-01-ENTEL',
    fecha_habilitacion: '2026-06-20T09:00:00Z'
  },
  {
    id: 'srv-2',
    training_session_id: 's-2',
    codigo_generacion: 'GR-01 CULQI',
    campaña: 'Culqi',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    estado: 'Deshabilitada',
    token: 'GR-01-CULQI'
  },
  {
    id: 'srv-3',
    training_session_id: 's-3',
    codigo_generacion: 'GR-01 PROSEGUR',
    campaña: 'Prosegur',
    formador_id: 'u-paloma',
    formador_nombre: 'Paloma Chamillo',
    estado: 'Deshabilitada',
    token: 'GR-01-PROSEGUR'
  }
];

// Initial survey responses
export const INITIAL_RESPONSES: SurveyResponse[] = [
  {
    id: 'resp-101',
    training_survey_id: 'srv-1',
    participant_id: 'p-101',
    dni: '45871254',
    nombre_ejecutivo: 'Juan Carlos Gómez Prado',
    campaña: 'Entel Empresas',
    codigo_generacion: 'GR-01 ENTEL',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    fecha_respuesta: '2026-06-21T10:15:00-05:00',
    q1: 5, q2: 5, q3: 5, q4: 4, q5: 5, q6: 4, q7: 5, q8: 5, q9: 5, q10: 5,
    total_score: 47.5,
    final_score_20: 19.0,
    classification: 'Excelente',
    p1: 5, p2: 5, p3: 5, p4: 4, p5: 5, p6: 4, p7: 5, p8: 5,
    promedio_individual: 4.75,
    comentario_positivo: 'El formador tiene un excelente dominio del tema y mucha paciencia para explicar.',
    aspecto_mejora: 'Dar un poco más de tiempo para las simulaciones de llamadas.'
  },
  {
    id: 'resp-102',
    training_survey_id: 'srv-1',
    participant_id: 'p-102',
    dni: '72548123',
    nombre_ejecutivo: 'Andrea Belén Soto Ramos',
    campaña: 'Entel Empresas',
    codigo_generacion: 'GR-01 ENTEL',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    fecha_respuesta: '2026-06-21T11:30:00-05:00',
    q1: 4, q2: 4, q3: 5, q4: 5, q5: 4, q6: 5, q7: 4, q8: 4, q9: 5, q10: 5,
    total_score: 43.75,
    final_score_20: 17.5,
    classification: 'Bueno',
    p1: 4, p2: 4, p3: 5, p4: 5, p5: 4, p6: 5, p7: 4, p8: 4,
    promedio_individual: 4.38,
    comentario_positivo: 'Muy dinámico todo, el material visual fue de gran ayuda.',
    aspecto_mejora: 'Los ejemplos de objeciones difíciles de clientes podrían reforzarse.'
  },
  {
    id: 'resp-103',
    training_survey_id: 'srv-1',
    participant_id: 'p-103',
    dni: '48512364',
    nombre_ejecutivo: 'Marlon Jesús Campos Díaz',
    campaña: 'Entel Empresas',
    codigo_generacion: 'GR-01 ENTEL',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    fecha_respuesta: '2026-06-21T14:45:00-05:00',
    q1: 5, q2: 5, q3: 5, q4: 5, q5: 5, q6: 5, q7: 5, q8: 5, q9: 5, q10: 5,
    total_score: 50.0,
    final_score_20: 20.0,
    classification: 'Excelente',
    p1: 5, p2: 5, p3: 5, p4: 5, p5: 5, p6: 5, p7: 5, p8: 5,
    promedio_individual: 5.0,
    comentario_positivo: 'Excelente capacitación, Víctor aclaró todas las dudas y nos hizo sentir listos para vender.',
    aspecto_mejora: 'Todo estuvo excelente, sigan así.'
  },
  {
    id: 'resp-104',
    training_survey_id: 'srv-1',
    participant_id: 'p-104',
    dni: '70215487',
    nombre_ejecutivo: 'Sofía Carolina Linares Flores',
    campaña: 'Entel Empresas',
    codigo_generacion: 'GR-01 ENTEL',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    fecha_respuesta: '2026-06-22T09:10:00-05:00',
    q1: 4, q2: 3, q3: 4, q4: 4, q5: 3, q6: 4, q7: 3, q8: 4, q9: 5, q10: 5,
    total_score: 36.25,
    final_score_20: 14.5,
    classification: 'Regular',
    p1: 4, p2: 3, p3: 4, p4: 4, p5: 3, p6: 4, p7: 3, p8: 4,
    promedio_individual: 3.63,
    comentario_positivo: 'El formador es muy amable y sabe bastante de las políticas de Entel.',
    aspecto_mejora: 'Debería ser un poco más pausado en los temas técnicos de redes.'
  },
  {
    id: 'resp-106',
    training_survey_id: 'srv-1',
    participant_id: 'p-106',
    dni: '32145698',
    nombre_ejecutivo: 'Estefany Maribel Huamán Quispe',
    campaña: 'Entel Empresas',
    codigo_generacion: 'GR-01 ENTEL',
    formador_id: 'u-victor',
    formador_nombre: 'Víctor Reynoso',
    fecha_respuesta: '2026-06-22T10:05:00-05:00',
    q1: 5, q2: 5, q3: 5, q4: 5, q5: 4, q6: 5, q7: 5, q8: 5, q9: 5, q10: 5,
    total_score: 48.75,
    final_score_20: 19.5,
    classification: 'Excelente',
    p1: 5, p2: 5, p3: 5, p4: 5, p5: 4, p6: 5, p7: 5, p8: 5,
    promedio_individual: 4.88,
    comentario_positivo: 'Las dinámicas grupales ayudaron mucho a perder el miedo y entender los planes.',
    aspecto_mejora: 'La ventilación de la sala de capacitación física.'
  }
];

// LocalStorage helpers
export const loadData = <T>(key: string, initialValue: T): T => {
  try {
    const item = localStorage.getItem(`fdr_${key}`);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage`, error);
    return initialValue;
  }
};

export const saveData = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(`fdr_${key}`, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage`, error);
  }
};

// Clear all data to restore initial
export const restoreInitialData = (): void => {
  localStorage.clear();
  window.location.reload();
};
