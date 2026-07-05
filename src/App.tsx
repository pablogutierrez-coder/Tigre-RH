/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  loadData,
  saveData,
} from './db/initialData';
import {
  User,
  Campaign,
  TrainingSession,
  Participant,
  AttendanceRecord,
  OperationConfirmation,
  AttendanceReopenRequest,
  AuditLog,
  AttendanceStatus,
  TrainingSurvey,
  SurveyResponse,
  SurveyStatus
} from './types';

// Icons
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck,
  Award,
  Clock,
  Users,
  FileSpreadsheet,
  FileText,
  Settings,
  LogOut,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Clock3,
  ClipboardCheck
} from 'lucide-react';

// Subcomponents
import BrandLogo from './components/BrandLogo';
import Dashboard from './components/Dashboard';
import Capacitaciones from './components/Capacitaciones';
import AttendanceControl from './components/AttendanceControl';
import AltaConfirmation from './components/AltaConfirmation';
import Reaperturas from './components/Reaperturas';
import Usuarios from './components/Usuarios';
import Reportes from './components/Reportes';
import Auditoria from './components/Auditoria';
import Encuestas from './components/Encuestas';
import PublicSurveyForm from './components/PublicSurveyForm';

import { getPeruNow, formatPeruDate, isAttendanceWindowOpen } from './utils/time';
import { permissions } from './utils/permissions';
import {
  loginWithUsername,
  logoutFirebase,
  subscribeToAuthChanges,
} from './services/firebase/authService';
import {
  changeUserPasswordByAdmin,
  createPlatformUser,
  deactivatePlatformUser,
  updatePlatformUser,
} from './services/firebase/userAdminService';
import loginBackgroundVideo from './assets/login-background.mp4';

const EMPTY_USERS: User[] = [];
const EMPTY_SESSIONS: TrainingSession[] = [];
const EMPTY_PARTICIPANTS: Participant[] = [];
const EMPTY_ATTENDANCE: AttendanceRecord[] = [];
const EMPTY_CONFIRMATIONS: OperationConfirmation[] = [];
const EMPTY_REOPENS: AttendanceReopenRequest[] = [];
const EMPTY_LOGS: AuditLog[] = [];
const EMPTY_SURVEYS: TrainingSurvey[] = [];
const EMPTY_RESPONSES: SurveyResponse[] = [];

const LOCAL_DATA_KEYS = [
  'fdr_users',
  'fdr_sessions',
  'fdr_participants',
  'fdr_attendance',
  'fdr_confirmations',
  'fdr_reopens',
  'fdr_logs',
  'fdr_surveys',
  'fdr_responses',
];

const ensureCleanLocalDataStore = () => {
  if (typeof window === 'undefined') return;

  const storageVersionKey = 'fdr_storage_schema';
  const currentVersion = 'empty-production-v1';

  if (localStorage.getItem(storageVersionKey) === currentVersion) return;

  LOCAL_DATA_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.setItem(storageVersionKey, currentVersion);
};

ensureCleanLocalDataStore();

export default function App() {
  const loginVideoRef = useRef<HTMLVideoElement | null>(null);

  // --- Persistent States ---
  const [users, setUsers] = useState<User[]>(() => {
    return loadData('users', EMPTY_USERS);
  });
  const [sessions, setSessions] = useState<TrainingSession[]>(() => {
    const data = loadData('sessions', EMPTY_SESSIONS);
    const hasEquifax = data.some(s => s.campaña === 'Equifax');
    if (hasEquifax) {
      return EMPTY_SESSIONS;
    }
    return data;
  });
  const [participants, setParticipants] = useState<Participant[]>(() => loadData('participants', EMPTY_PARTICIPANTS));
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => loadData('attendance', EMPTY_ATTENDANCE));
  const [confirmations, setConfirmations] = useState<OperationConfirmation[]>(() => loadData('confirmations', EMPTY_CONFIRMATIONS));
  const [reopens, setReopens] = useState<AttendanceReopenRequest[]>(() => loadData('reopens', EMPTY_REOPENS));
  const [logs, setLogs] = useState<AuditLog[]>(() => loadData('logs', EMPTY_LOGS));
  const [surveys, setSurveys] = useState<TrainingSurvey[]>(() => {
    const loaded = loadData('surveys', EMPTY_SURVEYS);
    return loaded.map((s: any) => ({
      ...s,
      estado: s.estado === 'No habilitada' ? 'Deshabilitada' : s.estado
    }));
  });
  const [responses, setResponses] = useState<SurveyResponse[]>(() => loadData('responses', EMPTY_RESPONSES));

  // Sync to localStorage
  useEffect(() => { saveData('users', users); }, [users]);
  useEffect(() => { saveData('sessions', sessions); }, [sessions]);
  useEffect(() => { saveData('participants', participants); }, [participants]);
  useEffect(() => { saveData('attendance', attendance); }, [attendance]);
  useEffect(() => { saveData('confirmations', confirmations); }, [confirmations]);
  useEffect(() => { saveData('reopens', reopens); }, [reopens]);
  useEffect(() => { saveData('logs', logs); }, [logs]);
  useEffect(() => { saveData('surveys', surveys); }, [surveys]);
  useEffect(() => { saveData('responses', responses); }, [responses]);

  // Reactive calculation of participant final state
  useEffect(() => {
    setParticipants(prevParts => {
      let changed = false;
      const updated = prevParts.map(p => {
        const pAttendance = attendance.filter(a => a.participant_id === p.id && a.training_session_id === p.training_session_id);
        const hasConf = confirmations.some(c => c.participant_id === p.id && c.estado_alta === 'Alta confirmada');
        
        const days = [1, 2, 3, 4, 5].map(d => {
          const rec = pAttendance.find(a => a.dia === d);
          return rec ? rec.estado_asistencia : 'Pendiente';
        });

        let computedStatus: Participant['estado_final'] = 'Pendiente de gestión';

        if (hasConf) {
          computedStatus = 'Alta confirmada';
        } else if (days.includes('Desistió')) {
          computedStatus = 'Desistió';
        } else if (days.every(status => status === 'Pendiente')) {
          computedStatus = 'Pendiente de gestión';
        } else {
          const hasEverAttended = days.some(status => status === 'Asistió' || status === 'Tardanza');
          const firstMarked = days.find(status => status !== 'Pendiente');
          
          if (!hasEverAttended && firstMarked === 'Faltó') {
            computedStatus = 'No asistió';
          } else if (hasEverAttended && days.includes('Faltó')) {
            computedStatus = 'En riesgo';
          } else if (days.every(status => status === 'Asistió' || status === 'Tardanza')) {
            computedStatus = 'Pendiente de alta';
          } else {
            computedStatus = 'Pendiente de gestión';
          }
        }

        if (p.estado_final !== computedStatus) {
          changed = true;
          return { ...p, estado_final: computedStatus };
        }
        return p;
      });

      return changed ? updated : prevParts;
    });
  }, [attendance, confirmations]);

  // --- Auth state ---
  const [activeUser, setActiveUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fdr_active_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authChecking, setAuthChecking] = useState(true);

  // --- Navigation States ---
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // --- Public Satisfaction Survey Router States ---
  const [urlView, setUrlView] = useState<string | null>(null);
  const [urlToken, setUrlToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const token = params.get('token');
    if (view === 'survey') {
      setUrlView('survey');
      setUrlToken(token);
    }
  }, []);

  // --- Simulated Clock Control ---
  // Default to real Peru time
  const [simTime, setSimTime] = useState<{ hour: number; minute: number; isSimulated: boolean }>(() => {
    const pNow = getPeruNow();
    return {
      hour: Number(pNow.hour),
      minute: Number(pNow.minute),
      isSimulated: false
    };
  });

  // Synchronize simulation parameters with globals for the getPeruNow utility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const win = window as any;
      win.__fdr_is_simulated = false;
      win.__fdr_sim_hour = simTime.hour;
      win.__fdr_sim_minute = simTime.minute;
      localStorage.setItem('fdr_is_simulated', 'false');
      localStorage.setItem('fdr_sim_hour', String(simTime.hour));
      localStorage.setItem('fdr_sim_minute', String(simTime.minute));
    }
  }, [simTime]);

  // Central helper to retrieve current date/time based on selected simulation or real Peru time
  const getEffectivePeruTime = (): Date => {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));
  };

  // Synchronize simTime with real Peru time
  useEffect(() => {
    const updateClock = () => {
      const pNow = getPeruNow();
      setSimTime({
        hour: Number(pNow.hour),
        minute: Number(pNow.minute),
        isSimulated: false
      });
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Automatically update views depending on role when logging in
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('fdr_active_user', JSON.stringify(activeUser));
      // Set default views based on role
      if (activeUser.rol === 'Reclutador') {
        setCurrentView('capacitaciones');
      } else if (activeUser.rol === 'Formador') {
        setCurrentView('capacitaciones');
      } else {
        setCurrentView('dashboard');
      }
    } else {
      localStorage.removeItem('fdr_active_user');
    }
  }, [activeUser]);

  useEffect(() => {
    if (authChecking || activeUser) return;

    const video = loginVideoRef.current;
    if (!video) return;

    video.loop = false;
    video.muted = true;
    video.volume = 1;
    video.currentTime = 0;

    const playAttempt = video.play();
    playAttempt?.catch(() => undefined);

    const enableAudio = () => {
      video.muted = false;
      video.volume = 1;
      video.play().catch(() => undefined);
    };

    window.addEventListener('pointerdown', enableAudio, { once: true });
    window.addEventListener('keydown', enableAudio, { once: true });
    window.addEventListener('touchstart', enableAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', enableAudio);
      window.removeEventListener('keydown', enableAudio);
      window.removeEventListener('touchstart', enableAudio);
    };
  }, [activeUser, authChecking]);

  // --- Helper to register system audit logs ---
  const addAuditLog = (
    accion: string,
    modulo: string,
    detalle: string,
    campaña?: string,
    generacion?: string,
    partId?: string,
    partName?: string,
    prevVal?: string,
    newVal?: string,
    comment?: string,
    forcedUser?: User
  ) => {
    const userToLog = forcedUser || activeUser;
    if (!userToLog) return;

    const newLog: AuditLog = {
      id: `log-${Math.random().toString(36).substring(2, 11)}`,
      usuario_id: userToLog.id,
      usuario_nombre: userToLog.nombre,
      rol: userToLog.rol,
      accion,
      modulo,
      detalle,
      fecha: formatPeruDate(getEffectivePeruTime()),
      campaña,
      generacion,
      participante_id: partId,
      participante_nombre: partName,
      valor_anterior: prevVal,
      valor_nuevo: newVal,
      comentario: comment
    };

    setLogs(prev => [newLog, ...prev]);
  };

  // Track dashboard access for Coordinador and Sistemas roles for audit purposes
  useEffect(() => {
    if (activeUser) {
      if (currentView === 'dashboard' && (activeUser.rol === 'Coordinador' || activeUser.rol === 'Sistemas')) {
        addAuditLog(
          'Acceso al dashboard',
          'Dashboard General',
          `El usuario "${activeUser.nombre}" con rol "${activeUser.rol}" accedió al Dashboard General.`
        );
      }
    }
  }, [currentView, activeUser]);

  useEffect(() => {
    let isMounted = true;

    try {
      const unsubscribe = subscribeToAuthChanges((profile, firebaseUser) => {
        if (!isMounted) return;

        if (!firebaseUser) {
          setActiveUser(null);
          setAuthChecking(false);
          return;
        }

        if (!profile) {
          setActiveUser(null);
          setLoginError('La sesión existe, pero no se encontró el perfil en Firestore/users.');
          setAuthChecking(false);
          return;
        }

        if (profile.estado !== 'Activo') {
          setActiveUser(null);
          setLoginError('Usuario inactivo. Contacte al administrador.');
          setAuthChecking(false);
          return;
        }

        setActiveUser(profile);
        setAuthChecking(false);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (error) {
      console.error('Error subscribing to Firebase Auth state:', error);
      setAuthChecking(false);
      return undefined;
    }
  }, []);

  const getFirebaseLoginMessage = (error: unknown) => {
    const code = (error as { code?: string })?.code;

    if (code === 'functions/unauthenticated') return 'Usuario o contrasena incorrectos.';
    if (code === 'functions/permission-denied') return 'Usuario inactivo o sin permisos.';
    if (code === 'functions/failed-precondition') return 'Usuario sin credenciales configuradas.';
    if (code === 'functions/not-found') return 'La funcion de login no esta desplegada.';

    return error instanceof Error ? error.message : 'No se pudo iniciar sesion.';
  };

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const profile = await loginWithUsername(loginUser, loginPass);

      if (profile.estado !== 'Activo') {
        await logoutFirebase();
        setLoginError('Usuario inactivo. Contacte al administrador.');
        return;
      }

      setActiveUser(profile);
      addAuditLog('Inicio de sesion', 'Autenticacion', `El usuario ${profile.nombre} inicio sesion correctamente.`, undefined, undefined, undefined, undefined, undefined, undefined, undefined, profile);
      setLoginUser('');
      setLoginPass('');
    } catch (error) {
      setLoginError(getFirebaseLoginMessage(error));
    }
  };

  const handleLogout = async () => {
    if (activeUser) {
      addAuditLog('Cierre de sesión', 'Autenticación', `El usuario ${activeUser.nombre} cerró su sesión.`);
    }
    try {
      await logoutFirebase();
    } catch (error) {
      console.error('Error signing out from Firebase:', error);
    }
    setActiveUser(null);
    setSelectedSessionId(null);
  };

  // Quick Login Action
  const handleQuickLogin = (usr: string, pass: string) => {
    setLoginUser(usr);
    setLoginPass(pass);
  };

  // --- Actions & Database Updates ---

  // 1. Create Training Session
  const handleAddSession = (
    newSess: Omit<TrainingSession, 'id' | 'fecha_creacion' | 'formador_nombre' | 'reclutador_nombre'>,
    uploadedParticipants: Omit<Participant, 'id'>[]
  ) => {
    const sId = `s-${Math.random().toString(36).substring(2, 11)}`;
    const fUser = users.find(u => u.id === newSess.formador_id);
    const rUser = activeUser;

    const sessionObj: TrainingSession = {
      ...newSess,
      id: sId,
      formador_nombre: fUser ? fUser.nombre : 'Sin formador',
      reclutador_nombre: rUser ? rUser.nombre : 'Sin reclutador',
      fecha_creacion: new Date().toISOString()
    };

    // Add session
    setSessions(prev => [sessionObj, ...prev]);

    // Automatically create survey template
    const genCode = sessionObj.generation_code || `GR-${Math.floor(10 + Math.random() * 90)}`;
    const surveyObj: TrainingSurvey = {
      id: `srv-${Math.random().toString(36).substring(2, 11)}`,
      training_session_id: sId,
      codigo_generacion: genCode,
      campaña: sessionObj.campaña,
      formador_id: sessionObj.formador_id,
      formador_nombre: sessionObj.formador_nombre,
      estado: 'Deshabilitada',
      token: genCode.trim().replace(/\s+/g, '-')
    };
    setSurveys(prev => [surveyObj, ...prev]);

    // Add its participants
    const partsWithId = uploadedParticipants.map((p, idx) => {
      // Determine initial estado_final if pre-calculated
      return {
        ...p,
        id: `p-${idx}-${Math.random().toString(36).substring(2, 8)}`,
        training_session_id: sId,
        estado_final: p.estado_final || 'Pendiente de gestión'
      };
    });

    setParticipants(prev => [...prev, ...partsWithId]);

    // Automatically prepare attendance records for each day (1 to 5) with imported states or 'Seleccionar'
    const initialAttendanceRecords: AttendanceRecord[] = [];
    partsWithId.forEach(p => {
      for (let dayNum = 1; dayNum <= 5; dayNum++) {
        let recDate = newSess.fecha_inicio;
        try {
          const baseDate = new Date(newSess.fecha_inicio + 'T12:00:00');
          baseDate.setDate(baseDate.getDate() + (dayNum - 1));
          recDate = baseDate.toISOString().split('T')[0];
        } catch (e) {
          // fallback
        }

        const attKey = `asistencia_dia_${dayNum}` as keyof typeof p;
        const obsKey = `observacion_dia_${dayNum}` as keyof typeof p;
        const initialStatus = (p[attKey] as AttendanceStatus) || 'Seleccionar';
        const initialObs = (p[obsKey] as string) || '';

        initialAttendanceRecords.push({
          id: `att-${Math.random().toString(36).substring(2, 11)}`,
          participant_id: p.id,
          training_session_id: sId,
          dia: dayNum,
          fecha: recDate,
          estado_asistencia: initialStatus,
          observacion: initialObs,
          motivo_desercion: initialStatus === 'Desistió' ? (p.motivo_desercion || '') : undefined,
          registrado_por: rUser ? rUser.id : 'sistema',
          fecha_registro: new Date().toISOString()
        });
      }
    });

    setAttendance(prev => [...prev, ...initialAttendanceRecords]);

    // Register automatic code generation audit log
    if (sessionObj.generation_code) {
      addAuditLog(
        'Creación automática de código de generación',
        'Registro de capacitaciones',
        `Se generó automáticamente el código de generación "${sessionObj.generation_code}" para la campaña "${newSess.campaña}".`,
        newSess.campaña,
        newSess.nombre_generacion
      );
    }

    // Register upload history record
    addAuditLog(
      'Creación de capacitación',
      'Registro de capacitaciones',
      `Se creó la generación "${newSess.nombre_generacion}" con ${partsWithId.length} participantes asignados a ${sessionObj.formador_nombre}.`,
      newSess.campaña,
      newSess.nombre_generacion
    );

    addAuditLog(
      'Carga de archivo de participantes',
      'Carga de participantes',
      `Se cargaron y mapearon ${partsWithId.length} participantes de forma exitosa para la generación "${newSess.nombre_generacion}".`,
      newSess.campaña,
      newSess.nombre_generacion
    );
  };

  // --- Satisfaction Survey State Modifiers ---
  const handleUpdateSurveyStatus = (surveyId: string, status: SurveyStatus) => {
    setSurveys(prev => prev.map(s => {
      if (s.id === surveyId) {
        const nowStr = new Date().toISOString();
        const nowPeru = formatPeruDate(getEffectivePeruTime());
        const updated = {
          ...s,
          estado: status,
          fecha_habilitacion: status === 'Habilitada' ? nowStr : s.fecha_habilitacion,
          fecha_cierre: status === 'Cerrada' ? nowStr : s.fecha_cierre,
          enabled_at: status === 'Habilitada' ? nowStr : s.enabled_at,
          disabled_at: status === 'Deshabilitada' ? nowStr : s.disabled_at,
          closed_at: status === 'Cerrada' ? nowStr : s.closed_at,
          deleted_at: status === 'Eliminada' ? nowPeru : s.deleted_at,
          deleted_by: status === 'Eliminada' ? (activeUser?.id || '') : s.deleted_by
        };
        addAuditLog(
          `Estado de encuesta modificado: ${status}`,
          'Encuestas de Satisfacción',
          `Se cambió el estado de la encuesta de la generación "${s.codigo_generacion}" a: "${status}".`,
          s.campaña,
          s.codigo_generacion
        );
        return updated;
      }
      return s;
    }));
  };

  const handleAddSurvey = (newSurvey: TrainingSurvey) => {
    setSurveys(prev => [newSurvey, ...prev]);
    addAuditLog(
      'Encuesta creada manualmente',
      'Encuestas de Satisfacción',
      `Se creó una nueva encuesta para la generación "${newSurvey.codigo_generacion}" de la campaña "${newSurvey.campaña}".`,
      newSurvey.campaña,
      newSurvey.codigo_generacion
    );
  };

  const handleOpenPublicSurvey = (token: string) => {
    setUrlView('survey');
    setUrlToken(token);
    const origin = window.location.origin + window.location.pathname;
    window.history.pushState({}, '', `${origin}?view=survey&token=${token}`);
  };

  // 2. Delete Training Session
  const handleDeleteSession = (sId: string) => {
    const sessionObj = sessions.find(s => s.id === sId);
    if (!sessionObj) return;

    const partsCount = participants.filter(p => p.training_session_id === sId).length;

    setSessions(prev => prev.filter(s => s.id !== sId));
    setParticipants(prev => prev.filter(p => p.training_session_id !== sId));
    setAttendance(prev => prev.filter(a => a.training_session_id !== sId));
    setConfirmations(prev => prev.filter(c => c.training_session_id !== sId));

    addAuditLog(
      'Eliminación de capacitación',
      'Registro de capacitaciones',
      `Se eliminó la capacitación "${sessionObj.nombre_generacion}" y sus ${partsCount} registros asociados debido a un error de carga.`,
      sessionObj.campaña,
      sessionObj.nombre_generacion
    );
  };

  // 2b. Close training campaign (Cierre de capacitación)
  const handleCloseCampaign = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const userRol = activeUser?.rol;
    if (userRol !== 'Administrador' && userRol !== 'Formador' && userRol !== 'Analista') {
      alert('No tiene permisos para realizar el cierre de la capacitación.');
      return;
    }

    // If Formador, check if they are the owner of the session
    if (userRol === 'Formador' && session.formador_id !== activeUser?.id) {
      alert('Solo el formador asignado o un Administrador pueden cerrar esta capacitación.');
      return;
    }

    const sessionParts = participants.filter(p => p.training_session_id === sessionId);

    // 1. Validate attendance for 5 days
    const isAsistenciaCompleta = sessionParts.every(p => {
      const pAtts = attendance.filter(a => a.participant_id === p.id);
      const hasDesistio = pAtts.some(a => a.estado_asistencia === 'Desistió') || p.estado_final === 'Desistió';
      return hasDesistio || pAtts.length === 5;
    });

    if (!isAsistenciaCompleta) {
      alert('No se puede cerrar la capacitación: Falta completar el registro de asistencia de los 5 días para todos los participantes activos.');
      return;
    }

    // 2. Validate desertion reasons and observations
    const isDesercionesValidas = sessionParts.every(p => {
      const hasDesistio = p.estado_final === 'Desistió' || attendance.some(a => a.participant_id === p.id && a.estado_asistencia === 'Desistió');
      if (!hasDesistio) return true;

      const motive = p.motivo_desercion || attendance.find(a => a.participant_id === p.id && a.estado_asistencia === 'Desistió')?.motivo_desercion;
      const obs = p.observacion_general || attendance.find(a => a.participant_id === p.id && a.estado_asistencia === 'Desistió')?.observacion;

      return !!motive?.trim() && !!obs?.trim();
    });

    if (!isDesercionesValidas) {
      alert('No se puede cerrar la capacitación: Existen participantes desistidos sin motivo de deserción u observación registrado.');
      return;
    }

    // 3. For Formador, check "Ningún participante en estado Marcar, Seleccionar o Pendiente" in Resultado formación
    if (userRol === 'Formador') {
      const isResultadoFormacionCompleto = sessionParts.every(p => {
        const hasDesistio = p.estado_final === 'Desistió' || attendance.some(a => a.participant_id === p.id && a.estado_asistencia === 'Desistió');
        if (hasDesistio) return true;
        
        return p.resultado_formacion && p.resultado_formacion !== 'Marcar';
      });

      if (!isResultadoFormacionCompleto) {
        alert('No se puede cerrar la capacitación: Debe calificar a todos los participantes activos como Apto o No apto (Resultado formación).');
        return;
      }
    }

    // Update session state to 'Capacitación cerrada'
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          estado: 'Capacitación cerrada'
        };
      }
      return s;
    }));

    addAuditLog(
      'Cierre de capacitación',
      'Control de asistencia',
      `El ${userRol === 'Administrador' ? 'administrador' : 'formador'} cerró oficialmente la capacitación "${session.nombre_generacion}".`,
      session.campaña,
      session.nombre_generacion
    );

    alert('¡La capacitación ha sido cerrada oficialmente con éxito!');
  };

  // 2c. Update training session details (for Administrador edit)
  const handleUpdateSession = (sessionId: string, updatedFields: Partial<TrainingSession>) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          ...updatedFields
        };
      }
      return s;
    }));
  };

  // 3. Mark Single Attendance Record
  const handleSaveAttendance = (rec: Omit<AttendanceRecord, 'id' | 'fecha_registro'>) => {
    const pId = rec.participant_id;
    const part = participants.find(p => p.id === pId);
    const sess = sessions.find(s => s.id === rec.training_session_id);

    // Check if record already exists for this participant and day
    const existingIdx = attendance.findIndex(a => a.participant_id === pId && a.dia === rec.dia);

    const updatedRec: AttendanceRecord = {
      ...rec,
      id: existingIdx !== -1 ? attendance[existingIdx].id : `att-${Math.random().toString(36).substring(2, 11)}`,
      fecha_registro: new Date().toISOString()
    };

    let prevStatus = 'Ninguno';
    if (existingIdx !== -1) {
      prevStatus = attendance[existingIdx].estado_asistencia;
      setAttendance(prev => {
        const copy = [...prev];
        copy[existingIdx] = updatedRec;
        return copy;
      });
    } else {
      setAttendance(prev => [...prev, updatedRec]);
    }

    // Auto update participant final state if marked "Desistió" or completed
    if (rec.estado_asistencia === 'Desistió') {
      setParticipants(prev => prev.map(p => {
        if (p.id === pId) return { ...p, estado_final: 'Desistió' };
        return p;
      }));
    }

    addAuditLog(
      'Marcado de asistencia',
      'Control de asistencia',
      `Se registró asistencia del Día ${rec.dia} para ${part ? part.nombres + ' ' + part.apellidos : pId} como "${rec.estado_asistencia}".`,
      sess?.campaña,
      sess?.nombre_generacion,
      pId,
      part ? `${part.nombres} ${part.apellidos}` : undefined,
      prevStatus,
      rec.estado_asistencia,
      rec.observacion
    );
  };

  // 4. Bulk Attendance Record
  const handleBulkAttendance = (
    sId: string,
    dia: number,
    status: AttendanceStatus,
    pIds: string[],
    motivo_desercion?: string,
    obs?: string
  ) => {
    const sess = sessions.find(s => s.id === sId);
    const date = new Date().toISOString().split('T')[0];

    const newRecords: AttendanceRecord[] = pIds.map(pId => {
      const existingIdx = attendance.findIndex(a => a.participant_id === pId && a.dia === dia);
      return {
        id: existingIdx !== -1 ? attendance[existingIdx].id : `att-${Math.random().toString(36).substring(2, 11)}`,
        participant_id: pId,
        training_session_id: sId,
        dia,
        fecha: date,
        estado_asistencia: status,
        minutos_tardanza: status === 'Tardanza' ? 10 : undefined,
        motivo_desercion,
        observacion: obs,
        registrado_por: activeUser ? activeUser.id : 'sistema',
        fecha_registro: new Date().toISOString()
      };
    });

    // Update attendance state
    setAttendance(prev => {
      // Filter out those being overwritten
      const filtered = prev.filter(a => !(a.training_session_id === sId && a.dia === dia && pIds.includes(a.participant_id)));
      return [...filtered, ...newRecords];
    });

    // Update participant final status
    if (status === 'Desistió') {
      setParticipants(prev => prev.map(p => {
        if (pIds.includes(p.id)) return { ...p, estado_final: 'Desistió' };
        return p;
      }));
    }

    addAuditLog(
      'Marcado masivo de asistencia',
      'Control de asistencia',
      `Se aplicó asistencia masiva (${status}) para ${pIds.length} participantes en el Día ${dia}.`,
      sess?.campaña,
      sess?.nombre_generacion
    );
  };

  const handleUpdateParticipantOutcome = (
    pId: string, 
    outcome: 'Marcar' | 'Apto' | 'No apto', 
    comment: string, 
    reason: string
  ) => {
    const part = participants.find(p => p.id === pId);
    if (!part) return;
    const sess = sessions.find(s => s.id === part.training_session_id);

    setParticipants(prev => prev.map(p => {
      if (p.id === pId) {
        return {
          ...p,
          resultado_formacion: outcome,
          comentario_aptitud: outcome === 'Apto' ? comment : '',
          motivo_no_apt: outcome === 'No apto' ? reason : '',
          estado_final: outcome === 'Apto' ? 'Pendiente de alta' : (outcome === 'No apto' ? 'Desistió' : p.estado_final)
        };
      }
      return p;
    }));

    addAuditLog(
      'Actualización de resultado formación',
      'Control de asistencia',
      `Se actualizó el resultado de formación de ${part.nombres} ${part.apellidos} a "${outcome}". ${outcome === 'Apto' ? 'Comentario: ' + comment : (outcome === 'No apto' ? 'Motivo: ' + reason : '')}`,
      sess?.campaña,
      sess?.nombre_generacion,
      pId,
      `${part.nombres} ${part.apellidos}`,
      part.resultado_formacion,
      outcome
    );
  };

  // 5. Create Reopen Request
  const handleRequestReopen = (req: Omit<AttendanceReopenRequest, 'id' | 'formador_id' | 'formador_nombre' | 'estado' | 'fecha_solicitud'>) => {
    if (!activeUser) return;

    const newReq: AttendanceReopenRequest = {
      ...req,
      id: `req-${Math.random().toString(36).substring(2, 11)}`,
      formador_id: activeUser.id,
      formador_nombre: activeUser.nombre,
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString()
    };

    setReopens(prev => [newReq, ...prev]);

    addAuditLog(
      'Solicitud de reapertura',
      'Control de asistencia',
      `El formador ${activeUser.nombre} solicitó reapertura para el Día ${req.dia_capacitacion} de la generación "${req.generacion}".`,
      req.campaña,
      req.generacion
    );
  };

  // 6. Approve Reopen Request
  const handleApproveRequest = (reqId: string, adminName: string) => {
    const req = reopens.find(r => r.id === reqId);
    if (!req) return;

    // Set enabled_until to end of current day (23:59:59)
    const limit = new Date();
    limit.setHours(23, 59, 59, 999);

    setReopens(prev => prev.map(r => {
      if (r.id === reqId) return {
        ...r,
        estado: 'aprobada',
        aprobado_por: adminName,
        fecha_respuesta: new Date().toISOString(),
        habilitado_hasta: limit.toISOString()
      };
      return r;
    }));

    addAuditLog(
      'Aprobación de reapertura',
      'Reaperturas de asistencia',
      `El administrador ${adminName} aprobó la reapertura del Día ${req.dia_capacitacion} para ${req.formador_nombre}.`,
      req.campaña,
      req.generacion
    );
  };

  // 7. Reject Reopen Request
  const handleRejectRequest = (reqId: string, adminName: string, reason: string) => {
    const req = reopens.find(r => r.id === reqId);
    if (!req) return;

    setReopens(prev => prev.map(r => {
      if (r.id === reqId) return {
        ...r,
        estado: 'rechazada',
        aprobado_por: adminName,
        fecha_respuesta: new Date().toISOString(),
        comentario_respuesta: reason
      };
      return r;
    }));

    addAuditLog(
      'Rechazo de reapertura',
      'Reaperturas de asistencia',
      `El administrador ${adminName} rechazó la reapertura del Día ${req.dia_capacitacion} para ${req.formador_nombre}. Motivo: ${reason}`,
      req.campaña,
      req.generacion
    );
  };

  // 8. Confirm Operation Alta
  const handleSaveConfirmation = (conf: Omit<OperationConfirmation, 'id' | 'fecha_registro'>) => {
    const pId = conf.participant_id;
    const part = participants.find(p => p.id === pId);
    const sess = sessions.find(s => s.id === conf.training_session_id);

    const existingIdx = confirmations.findIndex(c => c.participant_id === pId);

    const confirmationObj: OperationConfirmation = {
      ...conf,
      id: existingIdx !== -1 ? confirmations[existingIdx].id : `conf-${Math.random().toString(36).substring(2, 11)}`,
      fecha_registro: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      setConfirmations(prev => {
        const copy = [...prev];
        copy[existingIdx] = confirmationObj;
        return copy;
      });
    } else {
      setConfirmations(prev => [...prev, confirmationObj]);
    }

    // Update participant final state mapping
    setParticipants(prev => prev.map(p => {
      if (p.id === pId) return {
        ...p,
        estado_final: conf.estado_alta === 'Alta confirmada' ? 'Alta confirmada' :
                      conf.estado_alta === 'No alta' ? 'Desistió' : 'Pendiente de alta'
      };
      return p;
    }));

    addAuditLog(
      'Confirmación de alta',
      'Confirmación de altas',
      `Se registró estado de alta operativa como "${conf.estado_alta}" para ${part ? part.nombres + ' ' + part.apellidos : pId}.`,
      sess?.campaña,
      sess?.nombre_generacion,
      pId,
      part ? `${part.nombres} ${part.apellidos}` : undefined,
      undefined,
      conf.estado_alta,
      conf.observacion
    );
  };

  // 8b. Delete Operation Alta (Logical deletion)
  const handleDeleteConfirmation = (confId: string) => {
    const conf = confirmations.find(c => c.id === confId);
    if (!conf) return;

    const pId = conf.participant_id;
    const part = participants.find(p => p.id === pId);
    const sess = sessions.find(s => s.id === conf.training_session_id);

    // Update confirmation status to 'Eliminada' and mark isDeleted
    setConfirmations(prev => prev.map(c => {
      if (c.id === confId) {
        return {
          ...c,
          estado_alta: 'Eliminada',
          isDeleted: true,
          deletedAt: formatPeruDate(getEffectivePeruTime()),
          deletedBy: activeUser?.id || ''
        };
      }
      return c;
    }));

    // Update participant's estado_final to 'Pendiente de alta'
    setParticipants(prev => prev.map(p => {
      if (p.id === pId) {
        return {
          ...p,
          estado_final: 'Pendiente de alta'
        };
      }
      return p;
    }));

    addAuditLog(
      'Administrador elimina alta',
      'Confirmación de altas',
      `El administrador eliminó lógicamente el alta de ${part ? part.nombres + ' ' + part.apellidos : pId}.`,
      sess?.campaña,
      sess?.nombre_generacion,
      pId,
      part ? `${part.nombres} ${part.apellidos}` : undefined,
      conf.estado_alta,
      'Eliminada'
    );
  };

  // 9. Create/Edit User
  const handleAddUser = async (newUser: Omit<User, 'id' | 'fecha_creacion' | 'correo'> & { correo?: string }) => {
    if (activeUser?.rol !== 'Administrador') {
      alert('No tienes permisos para crear usuarios.');
      return;
    }

    if (!newUser.password) {
      alert('Se requiere una contraseÃ±a temporal para crear el usuario.');
      return;
    }

    const userObj = await createPlatformUser({
      nombre: newUser.nombre,
      usuario: newUser.usuario,
      password: newUser.password,
      rol: newUser.rol,
      estado: newUser.estado,
    });

    setUsers(prev => [...prev, userObj]);

    addAuditLog(
      'Creación de usuario',
      'Gestión de usuarios',
      `Se creó el usuario de sistema "${newUser.nombre}" con rol ${newUser.rol}.`
    );

    if (newUser.rol === 'Coordinador') {
      addAuditLog(
        'Usuario creado con rol Coordinador',
        'Gestión de usuarios',
        `Se creó el usuario de sistema "${newUser.nombre}" con rol Coordinador.`
      );
    } else if (newUser.rol === 'Sistemas') {
      addAuditLog(
        'Usuario creado con rol Sistemas',
        'Gestión de usuarios',
        `Se creó el usuario de sistema "${newUser.nombre}" con rol Sistemas.`
      );
    }
  };

  const handleUpdateUser = async (id: string, updatedUser: Partial<User>) => {
    const prevUser = users.find(u => u.id === id);
    if (!prevUser) return;

    const { password: _password, ...profileUpdate } = updatedUser;
    await updatePlatformUser(id, profileUpdate);

    setUsers(prev => prev.map(u => {
      if (u.id === id) return { ...u, ...profileUpdate };
      return u;
    }));

    let actionName = 'Modificación de usuario';
    let detailMsg = `Se modificó la cuenta del usuario de sistema "${prevUser.nombre}".`;

    if (updatedUser.estado !== undefined && updatedUser.estado !== prevUser.estado) {
      if (updatedUser.estado === 'Inactivo') {
        actionName = 'Usuario desactivado';
        detailMsg = `Se desactivó la cuenta del usuario de sistema "${prevUser.nombre}".`;
      } else {
        actionName = 'Usuario reactivado';
        detailMsg = `Se reactivó la cuenta del usuario de sistema "${prevUser.nombre}".`;
      }
    }

    addAuditLog(
      actionName,
      'Gestión de usuarios',
      detailMsg,
      undefined,
      undefined,
      undefined,
      undefined,
      JSON.stringify(prevUser),
      JSON.stringify({ ...prevUser, ...profileUpdate })
    );
  };

  const handleDeleteUser = (id: string) => {
    const userToDelete = users.find(u => u.id === id);
    if (!userToDelete) return;

    if (activeUser?.rol !== 'Administrador') {
      alert('No tienes permisos para eliminar usuarios.');
      addAuditLog(
        'Intento de eliminar usuario sin permiso',
        'Usuarios FDR',
        `El usuario "${activeUser?.nombre}" con rol "${activeUser?.rol}" intentó eliminar al usuario "${userToDelete.nombre}", pero fue bloqueado por falta de permisos.`
      );
      return;
    }

    const activeAdmins = users.filter(
      u => u.rol === 'Administrador' && u.estado === 'Activo'
    );

    if (
      userToDelete.rol === 'Administrador' &&
      userToDelete.estado === 'Activo' &&
      activeAdmins.length <= 1
    ) {
      alert('No puedes eliminar el único usuario administrador activo de la plataforma.');
      addAuditLog(
        'Intento de eliminar el único administrador activo',
        'Usuarios FDR',
        `El administrador "${activeUser?.nombre}" intentó eliminar al usuario administrador "${userToDelete.nombre}", pero fue bloqueado por ser el único administrador activo.`
      );
      return;
    }

    deactivatePlatformUser(id).catch(error => {
      console.error('Error deactivating user in Firestore:', error);
    });

    setUsers(prev => prev.filter(u => u.id !== id));

    addAuditLog(
      'Eliminación de usuario',
      'Usuarios FDR',
      `${activeUser?.nombre} eliminó al usuario ${userToDelete.usuario} el ${formatPeruDate(getEffectivePeruTime())}.`
    );
  };

  const handleResetUserPassword = async (user: User, newPassword: string) => {
    try {
      await changeUserPasswordByAdmin(user.id, newPassword);
      setUsers(prev =>
        prev.map(item =>
          item.id === user.id
            ? { ...item, requiere_cambio_password: true }
            : item,
        ),
      );
      alert(`Se actualizo la contrasena temporal de ${user.usuario}.`);
      addAuditLog(
        'Cambio de contrasena temporal',
        'Gestion de usuarios',
        `Se actualizo la contrasena temporal para "${user.nombre}".`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cambiar la contrasena temporal.';
      alert(message);
      throw new Error(message);
    }
  };

  const handleAttemptLockedEdit = (sessionName: string, campaign: string, day: number) => {
    const isReadOnly = !permissions[activeUser?.rol || 'Formador']?.canEditAttendance;
    if (isReadOnly) {
      addAuditLog(
        'Intento de edición bloqueado por rol solo lectura',
        'Control de asistencia',
        `El usuario "${activeUser?.nombre}" con rol solo lectura "${activeUser?.rol}" intentó modificar la asistencia para el Día ${day}. El intento fue bloqueado.`,
        campaign,
        sessionName
      );
    } else {
      addAuditLog(
        'Intento de edición fuera de horario por Formador',
        'Control de asistencia',
        `El formador "${activeUser?.nombre}" intentó registrar o modificar asistencia fuera de horario (bloqueado) para el Día ${day}.`,
        campaign,
        sessionName
      );
    }
  };

  // --- Views Router Handler ---
  const handleViewAttendance = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentView('asistencia');
  };

  const activeSession = sessions.find(s => s.id === selectedSessionId);

  // Extract list of unique trainers and recruiters
  const trainersList = users.filter(u => u.rol === 'Formador' && u.estado === 'Activo');
  const recruitersList = users.filter(u => u.rol === 'Reclutador' && u.estado === 'Activo');

  // --- Public Satisfaction Survey Router Render Interceptor ---
  if (urlView === 'survey') {
    return (
      <PublicSurveyForm
        surveys={surveys}
        sessions={sessions}
        participants={participants}
        responses={responses}
        attendance={attendance}
        surveyToken={urlToken}
        onAddResponse={(resp) => {
          setResponses(prev => [resp, ...prev]);
        }}
        onAuditLog={(accion, modulo, detalle, campaña, generacion, partId, partName, prevVal, newVal, comment, forcedUser) => {
          const logId = `l-${Math.random().toString(36).substring(2, 11)}`;
          const logObj = {
            id: logId,
            usuario_id: forcedUser?.id || 'ejecutivo-publico',
            usuario_nombre: forcedUser?.nombre || 'Ejecutivo Público',
            usuario_rol: (forcedUser?.rol || 'Ejecutivo') as any,
            accion,
            modulo,
            detalle,
            fecha: new Date().toISOString(),
            campaña,
            generacion,
            participante_id: partId,
            participante_nombre: partName
          };
          setLogs(prev => [logObj, ...prev]);
        }}
        onClosePublicSurvey={() => {
          window.history.pushState({}, '', window.location.pathname);
          setUrlView(null);
          setUrlToken(null);
        }}
      />
    );
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center font-sans">
        <div className="glass-card rounded-2xl px-5 py-4 text-xs font-bold text-slate-600">
          Verificando sesión...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans relative" id="root-app">
      
      {/* Soft brand background */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_52%,#eef2ff_100%)]"></div>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-violet-600 to-blue-600"></div>
        <div className="absolute inset-x-10 top-24 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent"></div>
      </div>
      
      {/* 1. AUTHENTICATED OR NOT ROUTING */}
      {!activeUser ? (
        /* LOGIN PANEL GRID */
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 relative overflow-hidden bg-slate-950" id="login-layout">
          <video
            ref={loginVideoRef}
            src={loginBackgroundVideo}
            className="login-bg-video absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={(event) => {
              event.currentTarget.pause();
            }}
          />

          <div className="hidden lg:block lg:col-span-7"></div>

          {/* Login Panel */}
          <div className="lg:col-span-5 flex items-center justify-center px-4 py-6 sm:p-12 relative z-10">
            <div className="login-card w-full space-y-8 bg-white/90 backdrop-blur-xl border border-white/70 p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-900/15">
              <div className="text-center lg:text-left">
                <h2 className="text-slate-800 text-2xl font-black tracking-tight">Iniciar Sesión</h2>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0 animate-bounce" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Usuario</label>
                  <input
                    type="text"
                    required
                    value={loginUser}
                    onChange={(e) => setLoginUser(e.target.value)}
                    placeholder="Ingrese su usuario..."
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-hidden font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Contraseña</label>
                  <input
                    type="password"
                    required
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    placeholder="Ingrese su contraseña..."
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm text-slate-800 outline-hidden font-medium"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:opacity-90 active:scale-[0.98] text-white font-bold text-sm rounded-xl py-3 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Ingresar
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* MAIN APPLICATION LAYOUT */
        <div className="min-h-screen flex flex-col lg:flex-row" id="app-layout">
          
          {/* Sidebar */}
          <aside className="w-full lg:w-72 bg-white/94 backdrop-blur-xl border-r border-slate-200 text-slate-700 flex flex-col shrink-0 shadow-xl shadow-slate-200/60">
            {/* Sidebar Brand Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <BrandLogo size={42} />
                <div>
                  <h1 className="font-extrabold text-base tracking-tight leading-none text-slate-950">Automatizate</h1>
                  <span className="text-[9px] text-fuchsia-600 font-bold uppercase tracking-widest block">FDR Portal</span>
                </div>
              </div>
              <span className="bg-slate-50 text-[10px] text-slate-500 px-2 py-0.5 rounded font-mono font-bold border border-slate-200">
                v1.1
              </span>
            </div>

            {/* Sidebar User profile Info */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center gap-3">
              <div className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md shadow-fuchsia-900/20">
                {activeUser.nombre.substring(0, 2).toUpperCase()}
              </div>
              <div className="truncate text-xs">
                <p className="font-bold text-slate-900 truncate">{activeUser.nombre}</p>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">{activeUser.rol}</p>
              </div>
            </div>

            {/* Navigation links based on Role */}
            <nav className="flex-1 p-4 space-y-1" id="sidebar-nav">
              
              {/* ADMIN ROLE MENU */}
              {activeUser.rol === 'Administrador' && (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-2">Monitoreo</div>
                  <button
                    onClick={() => { setCurrentView('dashboard'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'dashboard' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    Dashboard General
                  </button>

                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-4">Operaciones FDR</div>
                  <button
                    onClick={() => { setCurrentView('capacitaciones'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'capacitaciones' && !selectedSessionId ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Registro de Capacitaciones
                  </button>

                  <button
                    onClick={() => {
                      // Lead to active list if no session selected, otherwise keep selected
                      setCurrentView('asistencia');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'asistencia' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <CalendarCheck className="w-4 h-4 shrink-0" />
                    Control de Asistencia
                  </button>

                  <button
                    onClick={() => { setCurrentView('altas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'altas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Award className="w-4 h-4 shrink-0" />
                    Confirmación de Altas
                  </button>

                  <button
                    onClick={() => { setCurrentView('reaperturas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'reaperturas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 shrink-0" />
                      Reaperturas
                    </div>
                    {reopens.filter(r => r.estado === 'pendiente').length > 0 && (
                      <span className="bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded-md text-[9px]">
                        {reopens.filter(r => r.estado === 'pendiente').length}
                      </span>
                    )}
                  </button>

                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-4">Configuración y Reportes</div>
                  <button
                    onClick={() => { setCurrentView('usuarios'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'usuarios' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    Usuarios FDR
                  </button>

                  <button
                    onClick={() => { setCurrentView('reportes'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'reportes' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    Reportes Exportables
                  </button>

                  <button
                    onClick={() => { setCurrentView('auditoria'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'auditoria' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    Auditoría del Sistema
                  </button>

                  <button
                    onClick={() => { setCurrentView('encuestas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'encuestas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    Encuestas de Satisfacción
                  </button>
                </>
              )}

              {/* RECLUTADOR ROLE MENU */}
              {activeUser.rol === 'Reclutador' && (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-2 font-mono">Reclutamiento</div>
                  <button
                    onClick={() => { setCurrentView('capacitaciones'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'capacitaciones' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Registro de Capacitaciones
                  </button>

                  <button
                    onClick={() => { setCurrentView('altas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'altas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Award className="w-4 h-4 shrink-0" />
                    Confirmación de Altas
                  </button>

                  <button
                    onClick={() => { setCurrentView('reportes'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'reportes' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    Historial de Cargas
                  </button>

                  <button
                    onClick={() => { setCurrentView('encuestas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'encuestas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    Encuestas de Satisfacción
                  </button>
                </>
              )}

              {/* COORDINADOR / SISTEMAS ROLE MENU */}
              {(activeUser.rol === 'Coordinador' || activeUser.rol === 'Sistemas') && (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-2 font-mono">
                    Consulta {activeUser.rol}
                  </div>
                  <button
                    onClick={() => { setCurrentView('dashboard'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'dashboard' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    Dashboard General
                  </button>

                  <button
                    onClick={() => { setCurrentView('capacitaciones'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'capacitaciones' && !selectedSessionId ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Registro de Capacitaciones
                  </button>

                  <button
                    onClick={() => {
                      setCurrentView('asistencia');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'asistencia' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <CalendarCheck className="w-4 h-4 shrink-0" />
                    Control de Asistencia
                  </button>

                  <button
                    onClick={() => { setCurrentView('altas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'altas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Award className="w-4 h-4 shrink-0" />
                    Confirmación de Altas
                  </button>

                  <button
                    onClick={() => { setCurrentView('reportes'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'reportes' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 shrink-0" />
                    Reportes Exportables
                  </button>

                  <button
                    onClick={() => { setCurrentView('encuestas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'encuestas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    Encuestas de Satisfacción
                  </button>
                </>
              )}

              {/* FORMADOR ROLE MENU */}
              {activeUser.rol === 'Formador' && (
                <>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-2 font-mono">Aula FDR</div>
                  <button
                    onClick={() => { setCurrentView('capacitaciones'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'capacitaciones' && !selectedSessionId ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    Mis Capacitaciones
                  </button>

                  <button
                    onClick={() => {
                      // Lead to active list if no session selected, otherwise keep selected
                      setCurrentView('asistencia');
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'asistencia' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <CalendarCheck className="w-4 h-4 shrink-0" />
                    Control de Asistencia
                  </button>

                  <button
                    onClick={() => { setCurrentView('altas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'altas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Award className="w-4 h-4 shrink-0" />
                    Confirmación de Altas
                  </button>

                  <button
                    onClick={() => { setCurrentView('reaperturas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'reaperturas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    Solicitudes enviadas
                  </button>

                  <button
                    onClick={() => { setCurrentView('encuestas'); setSelectedSessionId(null); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      currentView === 'encuestas' ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <ClipboardCheck className="w-4 h-4 shrink-0" />
                    Encuestas de Satisfacción
                  </button>
                </>
              )}
            </nav>

            {/* Logout button */}
            <div className="p-4 border-t border-slate-200 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Cerrar Sesión
              </button>
            </div>
          </aside>

          {/* Main content viewport */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            
            {/* Top Navigation / Simulated Clock Controller Header */}
            <header className="glass-header px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-40">
              <div>
                <span className="text-[10px] text-fuchsia-600 font-bold uppercase tracking-widest font-mono">Automatizate Negocios</span>
                <h2 className="text-slate-800 text-lg font-black leading-tight tracking-tight">FDR | Formación y Desarrollo</h2>
              </div>

              {/* FECHA Y HORA OFICIAL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <Clock3 className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="text-xs">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Fecha y Hora (Perú/Lima)</span>
                  <span className="font-mono text-xs font-bold text-slate-700 mt-0.5 block">
                    {getPeruNow().formatted}
                  </span>
                </div>
              </div>
            </header>

            {/* View Port Content */}
            <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
              
              {/* If "asistencia" is clicked but no session is selected, guide them to pick one */}
              {currentView === 'asistencia' && !selectedSessionId && (
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                    <h3 className="text-slate-800 font-extrabold text-base mb-2">Paso 1: Seleccione la Capacitación a calificar</h3>
                    <p className="text-slate-500 text-xs">Por favor, diríjase a la pestaña "Registro de Capacitaciones" o "Mis Capacitaciones" y presione el botón de "Ver Asistencias" para abrir la cuadrícula de marcas diaria.</p>
                  </div>
                  <Capacitaciones
                    sessions={sessions}
                    participants={participants}
                    attendance={attendance}
                    surveys={surveys}
                    responses={responses}
                    currentUser={activeUser}
                    trainers={trainersList}
                    recruiters={recruitersList}
                    onAddSession={handleAddSession}
                    onDeleteSession={handleDeleteSession}
                    onViewAttendance={handleViewAttendance}
                    onCloseCampaign={handleCloseCampaign}
                    onUpdateSession={handleUpdateSession}
                  />
                </div>
              )}

              {/* View 1: General Dashboard */}
              {currentView === 'dashboard' && (activeUser.rol === 'Administrador' || activeUser.rol === 'Coordinador' || activeUser.rol === 'Sistemas') && (
                <Dashboard
                  sessions={sessions}
                  participants={participants}
                  attendance={attendance}
                  confirmations={confirmations}
                  reopens={reopens}
                  trainers={trainersList}
                  recruiters={recruitersList}
                />
              )}

              {/* View 2: Sessions List */}
              {currentView === 'capacitaciones' && (
                <Capacitaciones
                  sessions={sessions}
                  participants={participants}
                  attendance={attendance}
                  surveys={surveys}
                  responses={responses}
                  currentUser={activeUser}
                  trainers={trainersList}
                  recruiters={recruitersList}
                  onAddSession={handleAddSession}
                  onDeleteSession={handleDeleteSession}
                  onViewAttendance={handleViewAttendance}
                  onCloseCampaign={handleCloseCampaign}
                  onUpdateSession={handleUpdateSession}
                  onAuditLog={addAuditLog}
                />
              )}

              {/* View 3: Grid Daily Attendance Control */}
              {currentView === 'asistencia' && activeSession && (
                <AttendanceControl
                  session={activeSession}
                  participants={participants}
                  attendance={attendance}
                  confirmations={confirmations}
                  reopens={reopens}
                  currentUser={activeUser}
                  simulatedTime={simTime}
                  onSaveAttendance={handleSaveAttendance}
                  onBulkAttendance={handleBulkAttendance}
                  onRequestReopen={handleRequestReopen}
                  onUpdateParticipantOutcome={handleUpdateParticipantOutcome}
                  onGoBack={() => { setSelectedSessionId(null); setCurrentView('capacitaciones'); }}
                  onAttemptLockedEdit={handleAttemptLockedEdit}
                />
              )}

              {/* View 4: Operation Confirmed Altas */}
              {currentView === 'altas' && (
                <AltaConfirmation
                  sessions={sessions}
                  participants={participants}
                  confirmations={confirmations}
                  currentUser={activeUser}
                  onSaveConfirmation={handleSaveConfirmation}
                  onDeleteConfirmation={handleDeleteConfirmation}
                  onAuditLog={addAuditLog}
                />
              )}

              {/* View 5: Reopens requests lists */}
              {currentView === 'reaperturas' && (
                <Reaperturas
                  reopens={reopens}
                  currentUser={activeUser}
                  onApproveRequest={handleApproveRequest}
                  onRejectRequest={handleRejectRequest}
                />
              )}

              {/* View 6: Users Management */}
              {currentView === 'usuarios' && activeUser.rol === 'Administrador' && (
                <Usuarios
                  users={users}
                  currentUser={activeUser}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onResetPassword={handleResetUserPassword}
                />
              )}

              {/* View 7: Reportes Exportables */}
              {currentView === 'reportes' && (
                <Reportes
                  sessions={sessions}
                  participants={participants}
                  attendance={attendance}
                  confirmations={confirmations}
                  currentUser={activeUser}
                  onAuditLog={addAuditLog}
                />
              )}

              {/* View 8: Audit Log view */}
              {currentView === 'auditoria' && activeUser.rol === 'Administrador' && (
                <Auditoria logs={logs} />
              )}

              {/* View 9: Satisfaction Surveys Panel */}
              {currentView === 'encuestas' && (
                <Encuestas
                  surveys={surveys}
                  responses={responses}
                  sessions={sessions}
                  participants={participants}
                  currentUser={activeUser}
                  onUpdateSurveyStatus={handleUpdateSurveyStatus}
                  onAddSurvey={handleAddSurvey}
                  onAuditLog={addAuditLog}
                  onOpenPublicSurvey={handleOpenPublicSurvey}
                />
              )}

            </div>
          </main>
        </div>
      )}
    </div>
  );
}
