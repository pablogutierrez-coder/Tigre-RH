/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Lock,
  Unlock,
  PlusCircle,
  Info,
  Tag,
  SlidersHorizontal,
  RefreshCw,
  RotateCcw,
  Check,
  Filter
} from 'lucide-react';
import { TrainingSession, Participant, AttendanceRecord, AttendanceStatus, User as AppUser, AttendanceReopenRequest, OperationConfirmation } from '../types';
import { permissions } from '../utils/permissions';

interface AttendanceControlProps {
  session: TrainingSession;
  participants: Participant[];
  attendance: AttendanceRecord[];
  confirmations: OperationConfirmation[];
  reopens: AttendanceReopenRequest[];
  currentUser: AppUser;
  simulatedTime: { hour: number; minute: number; isSimulated: boolean };
  onSaveAttendance: (record: Omit<AttendanceRecord, 'id' | 'fecha_registro'>) => void;
  onBulkAttendance: (sessionId: string, dia: number, status: AttendanceStatus, participantIds: string[], motivo_desercion?: string, obs?: string) => void;
  onRequestReopen: (newRequest: Omit<AttendanceReopenRequest, 'id' | 'formador_id' | 'formador_nombre' | 'estado' | 'fecha_solicitud'>) => void;
  onUpdateParticipantOutcome?: (pId: string, outcome: 'Marcar' | 'Apto' | 'No apto', comment: string, reason: string) => void;
  onGoBack: () => void;
  onAttemptLockedEdit?: (sessionName: string, campaign: string, day: number) => void;
}

const MOTIVOS_DESERCION = [
  'No se presentó',
  'Abandono durante capacitación',
  'No acepta condiciones',
  'Otra propuesta laboral',
  'Problemas de horario',
  'Problemas personales',
  'Problemas de salud',
  'No cumple perfil',
  'Desistimiento voluntario',
  'Otro motivo'
];

export default function AttendanceControl({
  session,
  participants,
  attendance,
  confirmations,
  reopens,
  currentUser,
  simulatedTime,
  onSaveAttendance,
  onBulkAttendance,
  onRequestReopen,
  onUpdateParticipantOutcome,
  onGoBack,
  onAttemptLockedEdit
}: AttendanceControlProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Collapsible Filters Panel
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // New Search Filters
  const [filterAttendanceStatus, setFilterAttendanceStatus] = useState<string>('Todos');
  const [filterFinalStatus, setFilterFinalStatus] = useState<string>('Todos');
  const [filterAltaStatus, setFilterAltaStatus] = useState<string>('Todos');
  const [filterObservationsOnly, setFilterObservationsOnly] = useState<string>('Todos'); // 'Todos', 'Con observaciones', 'Sin observaciones'
  const [filterUnmarkedOnly, setFilterUnmarkedOnly] = useState<string>('Todos'); // 'Todos', 'Sin registrar', 'Registrado'

  // Modal states
  const [showDesistióModal, setShowDesistióModal] = useState(false);
  const [modalParticipant, setModalParticipant] = useState<Participant | null>(null);
  const [desistióMotivo, setDesistióMotivo] = useState(MOTIVOS_DESERCION[0]);
  const [desistióComentario, setDesistióComentario] = useState('');

  // Single Participant Observation Modal (Faltó/Tardanza)
  const [showObservationModal, setShowObservationModal] = useState(false);
  const [obsModalParticipant, setObsModalParticipant] = useState<Participant | null>(null);
  const [obsModalDay, setObsModalDay] = useState<number>(1);
  const [obsModalStatus, setObsModalStatus] = useState<AttendanceStatus>('Faltó');
  const [obsModalValue, setObsModalValue] = useState('');

  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenMotivo, setReopenMotivo] = useState('Se me pasó el horario de registro');
  const [reopenComentario, setReopenComentario] = useState('');

  // Bulk actions status and Bulk Dialog Modal
  const [showBulkDialogModal, setShowBulkDialogModal] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<AttendanceStatus>('Asistió');
  const [bulkMotivoDesercion, setBulkMotivoDesercion] = useState(MOTIVOS_DESERCION[0]);
  const [bulkComentario, setBulkComentario] = useState('');

  // Save feedback state (psychological peace of mind)
  const [showSaveFeedback, setShowSaveFeedback] = useState(false);

  // Training outcome (Apto / No apto) state variables
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeParticipant, setOutcomeParticipant] = useState<Participant | null>(null);
  const [activeOutcome, setActiveOutcome] = useState<'Marcar' | 'Apto' | 'No apto'>('Marcar');
  const [outcomeComment, setOutcomeComment] = useState('');
  const [outcomeReason, setOutcomeReason] = useState('');
  const [outcomeError, setOutcomeError] = useState('');

  const handleOutcomeSelect = (part: Participant, value: 'Marcar' | 'Apto' | 'No apto') => {
    if (value === 'Marcar') {
      if (onUpdateParticipantOutcome) {
        onUpdateParticipantOutcome(part.id, 'Marcar', '', '');
      }
    } else {
      setOutcomeParticipant(part);
      setActiveOutcome(value);
      setOutcomeComment(part.comentario_aptitud || '');
      setOutcomeReason(part.motivo_no_apt || '');
      setOutcomeError('');
      setShowOutcomeModal(true);
    }
  };

  const handleSaveOutcome = () => {
    if (!outcomeParticipant) return;
    if (activeOutcome === 'Apto' && !outcomeComment.trim()) {
      setOutcomeError('Debe ingresar el comentario de aptitud para los ejecutivos Aptos.');
      return;
    }
    if (activeOutcome === 'No apto' && !outcomeReason.trim()) {
      setOutcomeError('Debe ingresar el motivo de no aptitud para los ejecutivos No aptos.');
      return;
    }
    if (onUpdateParticipantOutcome) {
      onUpdateParticipantOutcome(outcomeParticipant.id, activeOutcome, outcomeComment, outcomeReason);
    }
    setShowOutcomeModal(false);
    setOutcomeParticipant(null);
  };

  // Map confirmations by participant_id (ignoring deleted/Eliminada ones)
  const confirmationsMap = useMemo(() => {
    const map: { [key: string]: OperationConfirmation } = {};
    confirmations.filter(c => !c.isDeleted && c.estado_alta !== 'Eliminada').forEach(c => {
      map[c.participant_id] = c;
    });
    return map;
  }, [confirmations]);

  // Map attendance for fast lookup [participantId_day] -> AttendanceRecord
  const attendanceMap = useMemo(() => {
    const map: { [key: string]: AttendanceRecord } = {};
    attendance.forEach(a => {
      if (a.training_session_id === session.id) {
        map[`${a.participant_id}_${a.dia}`] = a;
      }
    });
    return map;
  }, [attendance, session.id]);

  // Filter participants
  const filteredParts = useMemo(() => {
    return participants.filter(p => {
      if (p.training_session_id !== session.id) return false;

      // 1. Text Search matches
      const matchesSearch = p.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.dni.includes(searchTerm);
      if (!matchesSearch) return false;

      // 2. Attendance Status filter in the selectedDay
      const dayRecord = attendanceMap[`${p.id}_${selectedDay}`];
      const attStatus = dayRecord ? dayRecord.estado_asistencia : 'Pendiente';
      if (filterAttendanceStatus !== 'Todos' && attStatus !== filterAttendanceStatus) {
        return false;
      }

      // 3. Dynamic Calculation of Final Status for filtering
      const rowAttendance = [1, 2, 3, 4, 5].map(d => attendanceMap[`${p.id}_${d}`]);
      const hasDesistió = rowAttendance.some(a => a?.estado_asistencia === 'Desistió');
      const d1 = attendanceMap[`${p.id}_1`]?.estado_asistencia;

      let computedStatus = p.estado_final;
      if (hasDesistió) {
        computedStatus = 'Desistió';
      } else if (d1 === 'Faltó' && rowAttendance.filter(a => a).every(a => a.estado_asistencia === 'Faltó')) {
        computedStatus = 'No asistió';
      } else if (rowAttendance.some(a => a?.estado_asistencia === 'Faltó')) {
        computedStatus = 'En riesgo';
      } else if (rowAttendance.filter(a => a?.estado_asistencia === 'Asistió' || a?.estado_asistencia === 'Tardanza').length === 5) {
        const conf = confirmationsMap[p.id];
        computedStatus = conf?.estado_alta === 'Alta confirmada' ? 'Alta confirmada' : 'Pendiente de alta';
      }

      if (filterFinalStatus !== 'Todos' && computedStatus !== filterFinalStatus) {
        return false;
      }

      // 4. Alta status filter
      const conf = confirmationsMap[p.id];
      const altaStatusVal = conf ? conf.estado_alta : 'Pendiente de alta';
      if (filterAltaStatus !== 'Todos' && altaStatusVal !== filterAltaStatus) {
        return false;
      }

      // 5. Observations filter
      const hasAnyObservation = rowAttendance.some(a => a?.observacion?.trim()) || p.observacion?.trim();
      if (filterObservationsOnly === 'Con observaciones' && !hasAnyObservation) return false;
      if (filterObservationsOnly === 'Sin observaciones' && hasAnyObservation) return false;

      // 6. Unmarked / marked filter
      const isUnmarked = !dayRecord || dayRecord.estado_asistencia === 'Pendiente';
      if (filterUnmarkedOnly === 'Sin registrar' && !isUnmarked) return false;
      if (filterUnmarkedOnly === 'Registrado' && isUnmarked) return false;

      return true;
    });
  }, [participants, session.id, searchTerm, selectedDay, attendanceMap, confirmationsMap, filterAttendanceStatus, filterFinalStatus, filterAltaStatus, filterObservationsOnly, filterUnmarkedOnly]);

  // Attendance metrics & progress indicators (Item 6)
  const stats = useMemo(() => {
    let total = filteredParts.length;
    let asistio = 0;
    let tardanza = 0;
    let falto = 0;
    let desistio = 0;
    let pendiente = 0;

    filteredParts.forEach(p => {
      const record = attendanceMap[`${p.id}_${selectedDay}`];
      const status = record ? record.estado_asistencia : 'Pendiente';
      if (status === 'Asistió') asistio++;
      else if (status === 'Tardanza') tardanza++;
      else if (status === 'Faltó') falto++;
      else if (status === 'Desistió') desistio++;
      else pendiente++;
    });

    const marked = total - pendiente;
    const progressPercent = total > 0 ? Math.round((marked / total) * 100) : 0;

    return { total, asistio, tardanza, falto, desistio, pendiente, marked, progressPercent };
  }, [filteredParts, attendanceMap, selectedDay]);

  // Check if modification is locked based on Role, Simulated Time and Reopens
  const isTimeLocked = useMemo(() => {
    if (!currentUser) return true;

    // Central Guard: check if role has permission to edit attendance at all
    if (!permissions[currentUser.rol]?.canEditAttendance) return true;

    // Rule: Administrador -> Access permitted always
    if (currentUser.rol === 'Administrador') return false;

    // Rule: Formador -> Checks hours and reopens
    if (currentUser.rol === 'Formador') {
      const hour = simulatedTime.hour;
      const min = simulatedTime.minute;
      const totalMinutes = hour * 60 + min;

      const startMinutes = 9 * 60; // 09:00
      const endMinutes = 9 * 60 + 30; // 09:30

      const isWithinNormalWindow = totalMinutes >= startMinutes && totalMinutes <= endMinutes;

      if (isWithinNormalWindow) return false;

      // Check for approved reopen
      const hasApprovedReopen = reopens.some(r =>
        r.training_session_id === session.id &&
        r.dia_capacitacion === selectedDay &&
        r.estado === 'aprobada'
      );

      return !hasApprovedReopen;
    }

    return true;
  }, [currentUser, simulatedTime, reopens, session.id, selectedDay]);

  // Handle single attendance click change
  const handleStatusChange = (participant: Participant, day: number, status: AttendanceStatus) => {
    if (isTimeLocked) {
      const isReadOnly = !permissions[currentUser.rol]?.canEditAttendance;
      if (isReadOnly) {
        if (onAttemptLockedEdit) {
          onAttemptLockedEdit(session.nombre_generacion, session.campaña, day);
        }
        alert('Su rol de usuario es de solo lectura. No tiene permisos para modificar la asistencia.');
      } else {
        if (currentUser.rol === 'Formador' && onAttemptLockedEdit) {
          onAttemptLockedEdit(session.nombre_generacion, session.campaña, day);
        }
        alert('El horario de registro de asistencia finalizó a las 09:30. Para registrar o modificar asistencia, solicita autorización al administrador.');
      }
      return;
    }

    if (status === 'Desistió') {
      // Open Deserción details modal
      setModalParticipant(participant);
      setDesistióMotivo(MOTIVOS_DESERCION[0]);
      setDesistióComentario('');
      setShowDesistióModal(true);
    } else if (status === 'Faltó' || status === 'Tardanza') {
      // Open Novedad Observation capture modal
      const existing = attendanceMap[`${participant.id}_${day}`];
      setObsModalParticipant(participant);
      setObsModalDay(day);
      setObsModalStatus(status);
      setObsModalValue(existing?.observacion || '');
      setShowObservationModal(true);
    } else {
      onSaveAttendance({
        participant_id: participant.id,
        training_session_id: session.id,
        dia: day,
        fecha: getDayDate(day),
        estado_asistencia: status,
        registrado_por: currentUser.id
      });
    }
  };

  // Date generator based on Session Start Date
  const getDayDate = (day: number) => {
    try {
      const baseDate = new Date(session.fecha_inicio + 'T12:00:00');
      baseDate.setDate(baseDate.getDate() + (day - 1));
      return baseDate.toISOString().split('T')[0];
    } catch {
      return session.fecha_inicio;
    }
  };

  // Confirm Deserción Modal
  const handleConfirmDesistió = () => {
    if (!modalParticipant) return;
    onSaveAttendance({
      participant_id: modalParticipant.id,
      training_session_id: session.id,
      dia: selectedDay,
      fecha: getDayDate(selectedDay),
      estado_asistencia: 'Desistió',
      motivo_desercion: desistióMotivo,
      observacion: desistióComentario,
      registrado_por: currentUser.id
    });
    setShowDesistióModal(false);
    setModalParticipant(null);
  };

  // Submit Reopen Request
  const handleSubmitReopen = () => {
    onRequestReopen({
      training_session_id: session.id,
      campaña: session.campaña,
      generacion: session.nombre_generacion,
      fecha_capacitacion: getDayDate(selectedDay),
      dia_capacitacion: selectedDay,
      motivo: reopenMotivo,
      comentario: reopenComentario
    });
    setShowReopenModal(false);
    setReopenComentario('');
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedParticipants.length === filteredParts.length) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(filteredParts.map(p => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedParticipants.includes(id)) {
      setSelectedParticipants(selectedParticipants.filter(pId => pId !== id));
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
    }
  };

  // Bulk execution
  const handleBulkApply = () => {
    if (isTimeLocked) {
      if (currentUser.rol === 'Formador' && onAttemptLockedEdit) {
        onAttemptLockedEdit(session.nombre_generacion, session.campaña, selectedDay);
      }
      alert('El horario de registro de asistencia finalizó a las 09:30. Para registrar o modificar asistencia, solicita autorización al administrador.');
      return;
    }
    if (selectedParticipants.length === 0) {
      alert('Por favor seleccione al menos un participante para marcado masivo.');
      return;
    }

    setBulkMotivoDesercion(MOTIVOS_DESERCION[0]);
    setBulkComentario('');
    setShowBulkDialogModal(true);
  };

  const handleConfirmBulkApply = () => {
    onBulkAttendance(
      session.id,
      selectedDay,
      bulkStatus,
      selectedParticipants,
      bulkStatus === 'Desistió' ? bulkMotivoDesercion : undefined,
      bulkComentario || undefined
    );

    // Reset selection & options
    setSelectedParticipants([]);
    setShowBulkDialogModal(false);
    setBulkComentario('');
  };

  // Fetch current day request status
  const currentDayRequest = useMemo(() => {
    return reopens.find(r =>
      r.training_session_id === session.id &&
      r.dia_capacitacion === selectedDay
    );
  }, [reopens, session.id, selectedDay]);

  return (
    <div className="space-y-6">
      {/* Top Navigation Row */}
      <div className="flex justify-between items-center glass-card p-4 rounded-xl">
        <button
          onClick={onGoBack}
          className="text-slate-600 hover:text-slate-800 font-semibold text-sm flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Capacitaciones
        </button>

        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Campaña:</span>
          <span className="bg-indigo-50/70 text-indigo-700 font-bold text-xs px-2.5 py-1 rounded-full border border-indigo-100">
            {session.campaña}
          </span>
          <span className="bg-slate-100/70 text-slate-700 font-bold text-xs px-2.5 py-1 rounded-full border border-slate-200">
            {session.nombre_generacion}
          </span>
        </div>
      </div>

      {/* HORARIO / LOCK BANNER */}
      <div className={`rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        isTimeLocked
          ? 'bg-amber-500/10 backdrop-blur-md border-amber-500/20 text-amber-900 shadow-xs'
          : 'bg-emerald-500/10 backdrop-blur-md border-emerald-500/20 text-emerald-900 shadow-xs'
      }`}>
        <div className="flex gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isTimeLocked ? 'bg-amber-500/20 text-amber-800' : 'bg-emerald-500/20 text-emerald-800'
          }`}>
            {isTimeLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm flex items-center gap-1.5">
              {isTimeLocked ? 'Control de Asistencia Bloqueado' : 'Control de Asistencia Habilitado'}
              <span className="font-mono text-xs bg-white/70 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/50 shadow-xs text-slate-600">
                Hora: {String(simulatedTime.hour).padStart(2, '0')}:{String(simulatedTime.minute).padStart(2, '0')}
              </span>
            </h4>
            <p className="text-xs max-w-2xl leading-relaxed">
              {isTimeLocked
                ? 'El horario de registro de asistencia finalizó a las 09:30. Para registrar o modificar asistencia, solicita autorización al administrador.'
                : 'Se encuentra dentro del horario permitido oficial para registrar o modificar la asistencia del día.'}
            </p>

            {currentDayRequest && (
              <div className="text-xs font-semibold mt-1.5">
                Estado de solicitud de reapertura para el Día {selectedDay}:{' '}
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase ${
                  currentDayRequest.estado === 'aprobada' ? 'bg-emerald-600 text-white' :
                  currentDayRequest.estado === 'rechazada' ? 'bg-rose-600 text-white' :
                  'bg-amber-500 text-white'
                }`}>
                  {currentDayRequest.estado}
                </span>
                {currentDayRequest.comentario_respuesta && (
                  <span className="text-slate-500 font-normal ml-2 italic">
                    (Motivo: "{currentDayRequest.comentario_respuesta}")
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {isTimeLocked && (
          <button
            onClick={() => {
              if (currentDayRequest?.estado === 'pendiente') {
                alert('Ya tienes una solicitud pendiente para este día.');
                return;
              }
              setShowReopenModal(true);
            }}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
          >
            <Clock className="w-4 h-4" />
            Solicitar Reapertura Día {selectedDay}
          </button>
        )}
      </div>

      {/* 📊 INDICADORES VISUALES Y METRICAS DEL DIA */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {/* Total Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-bold uppercase">Total</span>
            <span className="text-xl font-black text-slate-800">{stats.total}</span>
          </div>
        </div>

        {/* Asistió Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-bold uppercase">Asistió</span>
            <span className="text-xl font-black text-emerald-700">{stats.asistio}</span>
          </div>
        </div>

        {/* Tardanza Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-bold uppercase">Tardanza</span>
            <span className="text-xl font-black text-amber-700">{stats.tardanza}</span>
          </div>
        </div>

        {/* Faltó Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-bold uppercase">Faltó</span>
            <span className="text-xl font-black text-rose-700">{stats.falto}</span>
          </div>
        </div>

        {/* Desistió Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[11px] text-slate-400 font-bold uppercase">Desistió</span>
            <span className="text-xl font-black text-slate-700">{stats.desistio}</span>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
            <span>Progreso</span>
            <span className="text-indigo-600 font-extrabold">{stats.progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden my-1">
            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${stats.progressPercent}%` }}></div>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold text-right block">
            {stats.marked} / {stats.total} Calificados
          </span>
        </div>
      </div>

      {/* Real-time sync feedback banner */}
      {showSaveFeedback && (
        <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-900 rounded-2xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-emerald-500 text-white p-1 rounded-full">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold">¡Asistencias Sincronizadas!</span> Las marcas del Día {selectedDay} se han guardado de forma segura en la base de datos de FDR.
            </div>
          </div>
          <button 
            onClick={() => setShowSaveFeedback(false)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs cursor-pointer"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Main Grid: Days tabs & Table */}
      <div className="glass-card rounded-2xl overflow-hidden shadow-md">
        {/* Day selection tabs & Controls */}
        <div className="bg-slate-950/5 border-b border-white/10 p-4 space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mr-2">Día de Control:</span>
              {[1, 2, 3, 4, 5].map(day => (
                <button
                  key={day}
                  onClick={() => {
                    setSelectedDay(day);
                    setSelectedParticipants([]);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedDay === day
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  Día {day}
                  <span className="block text-[9px] font-normal opacity-80 mt-0.5">{getDayDate(day).substring(5)}</span>
                </button>
              ))}
            </div>

            {/* Controls Bar: Search, Filters toggle, Sync */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Buscar por DNI o Nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs bg-white rounded-lg pl-8 pr-3 py-1.5 border border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  showFiltersPanel || filterAttendanceStatus !== 'Todos' || filterFinalStatus !== 'Todos' || filterAltaStatus !== 'Todos' || filterObservationsOnly !== 'Todos' || filterUnmarkedOnly !== 'Todos'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filtros</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showFiltersPanel ? 'rotate-180' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setShowSaveFeedback(true);
                  setTimeout(() => setShowSaveFeedback(false), 5000);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
                title="Sincronizar y Confirmar Marcas en FDR"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Confirmar Marcas</span>
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel (Item 4) */}
          {showFiltersPanel && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-inner grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Filter 1: Attendance Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Estado en Día {selectedDay}</label>
                <select
                  value={filterAttendanceStatus}
                  onChange={(e) => setFilterAttendanceStatus(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Todos">Todos</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Asistió">Asistió</option>
                  <option value="Tardanza">Tardanza</option>
                  <option value="Faltó">Faltó</option>
                  <option value="Desistió">Desistió</option>
                </select>
              </div>

              {/* Filter 2: Final Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Estado Final</label>
                <select
                  value={filterFinalStatus}
                  onChange={(e) => setFilterFinalStatus(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Todos">Todos</option>
                  <option value="Pendiente de gestión">Pendiente de gestión</option>
                  <option value="Completó capacitación">Completó capacitación</option>
                  <option value="Desistió">Desistió</option>
                  <option value="No asistió">No asistió</option>
                  <option value="En riesgo">En riesgo</option>
                  <option value="Pendiente de alta">Pendiente de alta</option>
                  <option value="Alta confirmada">Alta confirmada</option>
                </select>
              </div>

              {/* Filter 3: Alta Status */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Estado de Alta</label>
                <select
                  value={filterAltaStatus}
                  onChange={(e) => setFilterAltaStatus(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Todos">Todos</option>
                  <option value="Alta confirmada">Alta confirmada</option>
                  <option value="Pendiente de alta">Pendiente de alta</option>
                  <option value="No alta">No alta</option>
                </select>
              </div>

              {/* Filter 4: Observations */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Novedades / Observaciones</label>
                <select
                  value={filterObservationsOnly}
                  onChange={(e) => setFilterObservationsOnly(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="Todos">Todos</option>
                  <option value="Con observaciones">Con novedades / Obs</option>
                  <option value="Sin observaciones">Sin novedades / Obs</option>
                </select>
              </div>

              {/* Filter 5: Registration state & Clean */}
              <div className="space-y-1 flex flex-col justify-between">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Registro Asistencia</label>
                  <select
                    value={filterUnmarkedOnly}
                    onChange={(e) => setFilterUnmarkedOnly(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold"
                  >
                    <option value="Todos">Todos</option>
                    <option value="Sin registrar">Pendientes de marcas</option>
                    <option value="Registrado">Marcados</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    setFilterAttendanceStatus('Todos');
                    setFilterFinalStatus('Todos');
                    setFilterAltaStatus('Todos');
                    setFilterObservationsOnly('Todos');
                    setFilterUnmarkedOnly('Todos');
                  }}
                  className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold py-1 rounded-md flex items-center justify-center gap-1 border border-slate-300 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions Bar */}
        {!isTimeLocked && filteredParts.length > 0 && (
          <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">Marcado Masivo:</span>
              <span className="bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                {selectedParticipants.length} seleccionados
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as AttendanceStatus)}
                className="bg-white border rounded-lg p-1.5 text-xs text-slate-700 font-semibold"
              >
                <option value="Asistió">Marcar Asistió</option>
                <option value="Tardanza">Marcar Tardanza</option>
                <option value="Faltó">Marcar Faltó</option>
                <option value="Desistió">Marcar Desistió (Baja)</option>
              </select>

              <button
                onClick={handleBulkApply}
                disabled={selectedParticipants.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Aplicar a Selección
              </button>
            </div>
          </div>
        )}

        {/* Participants Table */}
        {filteredParts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No se encontraron participantes inscritos para esta capacitación.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  {!isTimeLocked && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={selectedParticipants.length === filteredParts.length}
                        onChange={toggleSelectAll}
                        className="rounded text-indigo-600"
                      />
                    </th>
                  )}
                  <th className="p-4">DNI / Candidato</th>
                  {[1, 2, 3, 4, 5].map(dayNum => (
                    <th key={dayNum} className={`p-4 text-center ${selectedDay === dayNum ? 'bg-indigo-50/50 text-indigo-700 font-bold' : ''}`}>
                      Día {dayNum}
                    </th>
                  ))}
                  <th className="p-4 text-center">Resultado formación</th>
                  <th className="p-4">Estado Final</th>
                  <th className="p-4">Deserción / Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredParts.map((part) => {
                  const isSelected = selectedParticipants.includes(part.id);

                  // Calculate reactive indicators for row
                  const rowAttendance = [1, 2, 3, 4, 5].map(d => attendanceMap[`${part.id}_${d}`]);
                  const hasDesistió = rowAttendance.some(a => a?.estado_asistencia === 'Desistió');
                  const d1 = attendanceMap[`${part.id}_1`]?.estado_asistencia;

                  // Dynamic final status calculations
                  let computedStatus = part.estado_final;
                  if (hasDesistió) {
                    computedStatus = 'Desistió';
                  } else if (d1 === 'Faltó' && rowAttendance.filter(a => a).every(a => a.estado_asistencia === 'Faltó')) {
                    computedStatus = 'No asistió';
                  } else if (rowAttendance.some(a => a?.estado_asistencia === 'Faltó')) {
                    computedStatus = 'En riesgo';
                  } else if (rowAttendance.filter(a => a?.estado_asistencia === 'Asistió' || a?.estado_asistencia === 'Tardanza').length === 5) {
                    computedStatus = part.estado_final === 'Alta confirmada' ? 'Alta confirmada' : 'Pendiente de alta';
                  }

                  const activeDesistioRecord = rowAttendance.find(a => a?.estado_asistencia === 'Desistió');

                  return (
                    <tr key={part.id} className={`hover:bg-slate-50/40 transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>
                      {!isTimeLocked && (
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(part.id)}
                            className="rounded text-indigo-600"
                          />
                        </td>
                      )}

                      {/* Candidate details */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-800 text-sm">
                          {part.nombres} {part.apellidos}
                        </div>
                        <div className="flex gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>DNI: {part.dni}</span>
                          <span>•</span>
                          <span>Cel: {part.celular}</span>
                        </div>
                      </td>

                      {/* Days markings */}
                      {[1, 2, 3, 4, 5].map((dayNum) => {
                        const record = attendanceMap[`${part.id}_${dayNum}`];
                        const isCurrentDay = selectedDay === dayNum;

                        return (
                          <td key={dayNum} className={`p-2 text-center ${isCurrentDay ? 'bg-indigo-50/20' : ''}`}>
                            {isTimeLocked && !isCurrentDay ? (
                              // Passive static display
                              record ? (
                                <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-[10px] ${
                                  record.estado_asistencia === 'Asistió' ? 'bg-emerald-50 text-emerald-700' :
                                  record.estado_asistencia === 'Tardanza' ? 'bg-amber-50 text-amber-700' :
                                  record.estado_asistencia === 'Faltó' ? 'bg-rose-50 text-rose-700' :
                                  'bg-red-50 text-red-800'
                                }`}>
                                  {record.estado_asistencia === 'Asistió' ? 'Asistió' :
                                   record.estado_asistencia === 'Tardanza' ? 'Tarde' :
                                   record.estado_asistencia === 'Faltó' ? 'Faltó' : 'Desistió'}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )
                            ) : (
                              // Interactive selectors for selectedDay
                              <div className="flex items-center justify-center gap-1">
                                {isTimeLocked ? (
                                  record ? (
                                    <span className={`inline-flex items-center justify-center font-bold px-2.5 py-1 rounded-full text-[10px] ${
                                      record.estado_asistencia === 'Asistió' ? 'bg-emerald-100 text-emerald-800' :
                                      record.estado_asistencia === 'Tardanza' ? 'bg-amber-100 text-amber-800' :
                                      record.estado_asistencia === 'Faltó' ? 'bg-rose-100 text-rose-800' :
                                      'bg-red-100 text-red-900'
                                    }`}>
                                      {record.estado_asistencia}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 italic">No marcado</span>
                                  )
                                ) : (
                                  <select
                                    value={record?.estado_asistencia || ''}
                                    onChange={(e) => handleStatusChange(part, dayNum, e.target.value as AttendanceStatus)}
                                    className={`text-[11px] font-bold rounded-lg p-1.5 border ${
                                      record?.estado_asistencia === 'Asistió' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                      record?.estado_asistencia === 'Tardanza' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                      record?.estado_asistencia === 'Faltó' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                      record?.estado_asistencia === 'Desistió' ? 'bg-red-50 border-red-200 text-red-800' :
                                      'bg-white border-slate-200 text-slate-500'
                                    }`}
                                  >
                                    <option value="" disabled>-- Marcar --</option>
                                    <option value="Asistió">Asistió</option>
                                    <option value="Tardanza">Tardanza</option>
                                    <option value="Faltó">Faltó</option>
                                    <option value="Desistió">Desistió</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Resultado formación cell */}
                      <td className="p-2 text-center bg-indigo-50/5">
                        {(() => {
                          const isTrainer = currentUser.rol === 'Formador';
                          const isAssignedTrainer = isTrainer && session.formador_id === currentUser.id;
                          const isAdmin = currentUser.rol === 'Administrador';
                          
                          // Formador can only mark for their own sessions on Day 5 (selectedDay === 5 or other Day 5 completions)
                          const canMarkOutcome = isAdmin || (isAssignedTrainer && selectedDay === 5);

                          const outcome = part.resultado_formacion || 'Marcar';

                          if (canMarkOutcome) {
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <select
                                  value={outcome}
                                  onChange={(e) => handleOutcomeSelect(part, e.target.value as any)}
                                  className={`text-[11px] font-bold rounded-lg p-1.5 border outline-hidden cursor-pointer ${
                                    outcome === 'Apto' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                                    outcome === 'No apto' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                                    'bg-white border-slate-200 text-slate-500'
                                  }`}
                                >
                                  <option value="Marcar">Marcar</option>
                                  <option value="Apto">Apto</option>
                                  <option value="No apto">No apto</option>
                                </select>
                                {outcome === 'Apto' && part.comentario_aptitud && (
                                  <span className="text-[9px] text-emerald-600 max-w-[120px] truncate block italic font-medium" title={part.comentario_aptitud}>
                                    {part.comentario_aptitud}
                                  </span>
                                )}
                                {outcome === 'No apto' && part.motivo_no_apt && (
                                  <span className="text-[9px] text-rose-600 max-w-[120px] truncate block italic font-medium" title={part.motivo_no_apt}>
                                    {part.motivo_no_apt}
                                  </span>
                                )}
                              </div>
                            );
                          } else {
                            // Read-only view for Reclutador, Coordinador, Sistemas, etc.
                            return (
                              <div className="flex flex-col items-center">
                                <span className={`inline-flex items-center justify-center font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                  outcome === 'Apto' ? 'bg-emerald-100 text-emerald-800' :
                                  outcome === 'No apto' ? 'bg-rose-100 text-rose-800' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {outcome}
                                </span>
                                {outcome === 'Apto' && part.comentario_aptitud && (
                                  <span className="text-[9px] text-slate-400 max-w-[120px] truncate block italic mt-0.5" title={part.comentario_aptitud}>
                                    {part.comentario_aptitud}
                                  </span>
                                )}
                                {outcome === 'No apto' && part.motivo_no_apt && (
                                  <span className="text-[9px] text-slate-400 max-w-[120px] truncate block italic mt-0.5" title={part.motivo_no_apt}>
                                    {part.motivo_no_apt}
                                  </span>
                                )}
                              </div>
                            );
                          }
                        })()}
                      </td>

                      {/* Final status display */}
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full font-bold text-[10px] ${
                          computedStatus === 'Alta confirmada' ? 'bg-emerald-100 text-emerald-800' :
                          computedStatus === 'Pendiente de alta' || computedStatus === 'Completó capacitación' ? 'bg-indigo-100 text-indigo-800' :
                          computedStatus === 'En riesgo' ? 'bg-amber-100 text-amber-800 font-semibold' :
                          computedStatus === 'Desistió' ? 'bg-red-100 text-red-800' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {computedStatus}
                        </span>
                      </td>

                      {/* Observation/Deserción Reason info */}
                      <td className="p-4 max-w-[150px] truncate">
                        {activeDesistioRecord ? (
                          <div className="text-[10px]" title={activeDesistioRecord.observacion}>
                            <p className="font-semibold text-rose-600 truncate">{activeDesistioRecord.motivo_desercion}</p>
                            <p className="text-slate-400 truncate italic">{activeDesistioRecord.observacion}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">Sin novedades</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: SINGLE PARTICIPANT DESERTION REASON */}
      {showDesistióModal && modalParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-white/40 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95 animate-duration-200">
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-slate-100 pb-2">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
              <h3 className="font-bold text-base">Registrar Deserción (Baja de FDR)</h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Estás marcando al participante <strong>{modalParticipant.nombres} {modalParticipant.apellidos}</strong> como desistido en el Día {selectedDay}. Este cambio es irreversible sin reapertura. Indica el motivo:
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Motivo de Deserción *</label>
                <select
                  value={desistióMotivo}
                  onChange={(e) => setDesistióMotivo(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-rose-500"
                >
                  {MOTIVOS_DESERCION.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Observaciones / Comentario de Baja *</label>
                <textarea
                  value={desistióComentario}
                  onChange={(e) => setDesistióComentario(e.target.value)}
                  placeholder="Explique las condiciones o comentarios vertidos por el candidato al retirarse..."
                  rows={3}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => {
                  setShowDesistióModal(false);
                  setModalParticipant(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDesistió}
                disabled={!desistióComentario.trim()}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Confirmar Baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT REOPEN REQUEST */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-white/40 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600 border-b border-slate-100 pb-2">
              <Clock className="w-5 h-5" />
              <h3 className="font-bold text-base">Solicitar Reapertura de Asistencia</h3>
            </div>

            <p className="text-slate-600 text-xs">
              Envía una solicitud formal al administrador para abrir la edición de asistencia del{' '}
              <strong>Día {selectedDay}</strong> en la campaña <strong>{session.campaña}</strong> ({session.nombre_generacion}).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Motivo Oficial *</label>
                <select
                  value={reopenMotivo}
                  onChange={(e) => setReopenMotivo(e.target.value)}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Se me pasó el horario de registro">Se me pasó el horario de registro</option>
                  <option value="Error al registrar asistencia">Error al registrar asistencia</option>
                  <option value="Problemas técnicos">Problemas técnicos</option>
                  <option value="Participante se incorporó tarde">Participante se incorporó tarde</option>
                  <option value="Validación pendiente con reclutamiento">Validación pendiente con reclutamiento</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Comentarios o Justificación *</label>
                <textarea
                  value={reopenComentario}
                  onChange={(e) => setReopenComentario(e.target.value)}
                  placeholder="Escriba los detalles de por qué requiere editar la asistencia..."
                  rows={3}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => setShowReopenModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReopen}
                disabled={!reopenComentario.trim()}
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NOVEDAD / OBSERVACION (Faltó/Tardanza) (Item 5) */}
      {showObservationModal && obsModalParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-white/40 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95 animate-duration-200">
            <div className={`flex items-center gap-2.5 border-b border-slate-100 pb-2 ${
              obsModalStatus === 'Faltó' ? 'text-rose-600' : 'text-amber-600'
            }`}>
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="font-bold text-base">Registrar Observación / Novedad</h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Estás registrando un estado de <strong>{obsModalStatus === 'Faltó' ? 'FALTA' : 'TARDANZA'}</strong> para{' '}
              <strong>{obsModalParticipant.nombres} {obsModalParticipant.apellidos}</strong> en el Día {obsModalDay}.
            </p>

            {obsModalStatus === 'Faltó' ? (
              <div className="bg-rose-50 text-rose-800 text-[11px] p-3 rounded-lg border border-rose-100 font-medium">
                ⚠️ El ingreso de observación o novedad es obligatorio para registrar una inasistencia (Faltó) en FDR.
              </div>
            ) : (
              <div className="bg-amber-50 text-amber-800 text-[11px] p-3 rounded-lg border border-amber-100 font-medium">
                💡 Se recomienda detallar los minutos de tardanza o justificaciones entregadas por el participante.
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Descripción de la Novedad *</label>
                <textarea
                  value={obsModalValue}
                  onChange={(e) => setObsModalValue(e.target.value)}
                  placeholder={obsModalStatus === 'Faltó' ? 'Indicar motivo (ej: Celular apagado, problema médico con certificado, no responde...)' : 'Detalle la tardanza (ej: Ingresó 15 minutos tarde por congestión vehicular...)'}
                  rows={3}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => {
                  setShowObservationModal(false);
                  setObsModalParticipant(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (obsModalStatus === 'Faltó' && !obsModalValue.trim()) {
                    alert('Debe rellenar obligatoriamente la observación para registrar una Falta.');
                    return;
                  }
                  onSaveAttendance({
                    participant_id: obsModalParticipant.id,
                    training_session_id: session.id,
                    dia: obsModalDay,
                    fecha: getDayDate(obsModalDay),
                    estado_asistencia: obsModalStatus,
                    observacion: obsModalValue,
                    registrado_por: currentUser.id
                  });
                  setShowObservationModal(false);
                  setObsModalParticipant(null);
                }}
                disabled={obsModalStatus === 'Faltó' && !obsModalValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Guardar Novedad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK MARKING ACTION WITH OBSERVATIONS DIALOG (Item 7) */}
      {showBulkDialogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-white/40 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95 animate-duration-200">
            <div className="flex items-center gap-2.5 text-indigo-600 border-b border-slate-100 pb-2">
              <PlusCircle className="w-5 h-5 animate-pulse" />
              <h3 className="font-bold text-base">Marcado Masivo de Asistencia</h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Vas a aplicar el estado <strong>{bulkStatus.toUpperCase()}</strong> a{' '}
              <strong>{selectedParticipants.length} participantes</strong> seleccionados en el Día {selectedDay}.
            </p>

            <div className="space-y-3 text-xs">
              {bulkStatus === 'Desistió' && (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Motivo de Deserción Masiva *</label>
                  <select
                    value={bulkMotivoDesercion}
                    onChange={(e) => setBulkMotivoDesercion(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                  >
                    {MOTIVOS_DESERCION.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Observación / Novedad {bulkStatus === 'Desistió' || bulkStatus === 'Faltó' ? '(Obligatorio) *' : '(Opcional)'}
                </label>
                <textarea
                  value={bulkComentario}
                  onChange={(e) => setBulkComentario(e.target.value)}
                  placeholder={bulkStatus === 'Desistió' || bulkStatus === 'Faltó' ? 'Escribe la justificación o comentario para este grupo...' : 'Ingresa comentarios o novedades si aplica...'}
                  rows={3}
                  className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs text-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => {
                  setShowBulkDialogModal(false);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBulkApply}
                disabled={(bulkStatus === 'Desistió' || bulkStatus === 'Faltó') && !bulkComentario.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Confirmar Marcado Masivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR RESULTADO FORMACION (Apto / No apto) */}
      {showOutcomeModal && outcomeParticipant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-6 max-w-md w-full border border-white/40 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95 animate-duration-200">
            <div className={`flex items-center gap-2.5 border-b border-slate-100 pb-2 ${
              activeOutcome === 'Apto' ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              <CheckCircle className="w-5 h-5" />
              <h3 className="font-bold text-base">Registrar Resultado Formación: {activeOutcome}</h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              Estás calificando al participante <strong>{outcomeParticipant.nombres} {outcomeParticipant.apellidos}</strong> como <strong>{activeOutcome.toUpperCase()}</strong>.
            </p>

            {outcomeError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold">
                {outcomeError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              {activeOutcome === 'Apto' ? (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Comentario de aptitud *</label>
                  <textarea
                    value={outcomeComment}
                    onChange={(e) => {
                      setOutcomeComment(e.target.value);
                      if (e.target.value.trim()) setOutcomeError('');
                    }}
                    placeholder="Escriba un comentario sobre el desempeño sobresaliente, actitud y potencial del ejecutivo..."
                    rows={4}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-emerald-500 text-xs text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Este comentario es obligatorio para ejecutivos Aptos.</p>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Motivo de no aptitud *</label>
                  <textarea
                    value={outcomeReason}
                    onChange={(e) => {
                      setOutcomeReason(e.target.value);
                      if (e.target.value.trim()) setOutcomeError('');
                    }}
                    placeholder="Detalle el motivo por el cual el ejecutivo no califica (ej: No supera evaluaciones técnicas, inasistencias acumuladas, bajo nivel de comunicación...)"
                    rows={4}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 outline-hidden focus:ring-1 focus:ring-rose-500 text-xs text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">El motivo de no aptitud es obligatorio para ejecutivos No aptos.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() => {
                  setShowOutcomeModal(false);
                  setOutcomeParticipant(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveOutcome}
                className={`font-bold text-xs px-5 py-2 rounded-xl text-white cursor-pointer ${
                  activeOutcome === 'Apto' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Guardar Resultado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
