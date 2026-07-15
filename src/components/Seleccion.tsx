/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  History,
  Loader2,
  Plus,
  Search,
  Send,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type {
  SelectionApplicant,
  SelectionApplicantStatus,
  SelectionAuditLog,
  SelectionRequisition,
  User as AppUser,
} from '../types';
import {
  assignSelectionToTraining,
  createSelectionApplicant,
  createSelectionRequisition,
  deleteSelectionApplicant,
  deleteSelectionRequisition,
  getSelectionBootstrap,
  importSelectionApplicants,
  updateSelectionApplicant,
  updateSelectionRequisition,
} from '../services/selectionService';

type ViewMode =
  | 'dashboard'
  | 'convocatorias'
  | 'postulantes'
  | 'seguimientos'
  | 'evaluaciones'
  | 'aptos'
  | 'agenda'
  | 'base'
  | 'automatizaciones'
  | 'asignacion'
  | 'historial'
  | 'catalogos'
  | 'configuracion'
  | 'reportes'
  | 'auditoria';

export type SelectionViewMode = ViewMode;

interface SeleccionProps {
  currentUser: AppUser;
  users: AppUser[];
  initialView?: ViewMode;
  onPlatformDataChanged?: () => void;
}

const emptyRequisition: Partial<SelectionRequisition> = {
  nombre: '',
  cuenta: 'Entel Empresas',
  posicion: '',
  ciudad: '',
  fuente_principal: 'Pandapé',
  vacantes: 1,
  meta_leads: 0,
  prioridad: 'Media',
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: new Date().toISOString().slice(0, 10),
  sla_objetivo: 60,
  sla_unidad: 'minutos',
  sla_tipo: 'Horas calendario',
  max_intentos_contacto: 3,
  seguimiento_max_horas: 24,
  reclutador_ids: [],
  reclutador_nombres: [],
  estado: 'Activa',
};

const applicantStatuses: SelectionApplicantStatus[] = [
  'Pendiente de gestión',
  'Registrado',
  'Pendiente de contacto',
  'Contactado',
  'No contactado',
  'Interesado',
  'Citado',
  'Ausente',
  'En evaluación',
  'No interesado',
  'No responde',
  'No contesta',
  'Entrevista inicial',
  'Examen teórico',
  'Entrevista RH',
  'Pruebas psicológicas',
  'Entrevista Supervisor/Coordinador',
  'Apto para capacitación',
  'Asignado a capacitación',
  'Alta en operación',
  'Caído',
  'Desistió',
  'No corresponde',
  'No apto',
];

const excelHeaders = [
  'Reclutador',
  'Coordi/Super',
  'Cuenta',
  'Fuente',
  'Posición',
  'Ciudad',
  'F. Nacimiento',
  'DNI',
  'Nombre y apellidos',
  'Teléfono',
  'Correo electrónico',
  'Entrevista',
  'Status',
  'Examen teórico',
  'Entrevista RH',
  'Pruebas psic',
  'Entrevista Super/Coord.',
];

const normalizeHeader = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const headerMap: Record<string, string> = {
  reclutador: 'reclutador_excel',
  coordisuper: 'coordinador_excel',
  cuenta: 'cuenta',
  fuente: 'fuente',
  posicion: 'posicion',
  ciudad: 'ciudad',
  fnacimiento: 'fecha_nacimiento',
  dni: 'dni',
  nombreyapellidos: 'nombre_completo',
  telefono: 'telefono',
  correoelectronico: 'correo',
  entrevista: 'entrevista',
  status: 'status_excel',
  examenteorico: 'examen_teorico',
  entrevistarh: 'entrevista_rh',
  pruebaspsic: 'pruebas_psic',
  entrevistasupercoord: 'entrevista_super_coord',
};

const getDaysLeft = (endDate?: string) => {
  if (!endDate) return 0;
  const today = new Date();
  const end = new Date(`${endDate}T23:59:59-05:00`);
  return Math.ceil((end.getTime() - today.getTime()) / 86400000);
};

const percent = (value: number, base: number) => (base > 0 ? Math.round((value / base) * 100) : 0);

const isManagerRole = (role: string) => ['Administrador', 'Analista', 'Coordinador'].includes(role);
const canCreateRequisition = (role: string) => ['Administrador', 'Analista', 'Coordinador'].includes(role);
const canEditRequisitionCode = (role: string) => role === 'Administrador';

const campaignOptions = ['Entel Empresas', 'Culqi', 'Equifax', 'Prosegur'];
const sourceOptions = ['Pandapé', 'Computrabajo', 'Boomerang', 'LinkedIn', 'Redes sociales'];
const finalRequisitionStates = ['Activa', 'Finalizada'];
const dashboardViews = ['Vista general', 'Vista por campaña', 'Vista individual por reclutador', 'Vista por convocatoria'];
const enableDataPolicyModule = false;

const selectionViewMeta: Record<ViewMode, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: 'Selección',
    title: 'Dashboard de Selección',
    description: 'Indicadores, conversión, SLA, cobertura, fuentes y rendimiento por reclutador.',
  },
  convocatorias: {
    eyebrow: 'Procesos',
    title: 'Procesos y convocatorias',
    description: 'Administra campañas activas, vacantes, cobertura, reclutadores y avance del proceso.',
  },
  postulantes: {
    eyebrow: 'Postulantes',
    title: 'Gestión de postulantes',
    description: 'Registra, importa, depura y gestiona postulantes por convocatoria.',
  },
  seguimientos: {
    eyebrow: 'Pipeline',
    title: 'Seguimiento Kanban',
    description: 'Visualiza el avance por etapa y mueve candidatos con control de estado persistente.',
  },
  evaluaciones: {
    eyebrow: 'Evaluaciones',
    title: 'Entrevistas y evaluaciones',
    description: 'Controla filtros, entrevistas, pruebas y resultado final de selección.',
  },
  aptos: {
    eyebrow: 'Aptos',
    title: 'Aptos para capacitación',
    description: 'Prepara candidatos validados para enviarlos al módulo de capacitación.',
  },
  agenda: {
    eyebrow: 'Agenda',
    title: 'Agenda y citaciones',
    description: 'Organiza entrevistas, citaciones y próximas acciones del equipo.',
  },
  base: {
    eyebrow: 'Base',
    title: 'Base general de postulantes',
    description: 'Consulta el historial consolidado de postulantes y sus últimas postulaciones.',
  },
  automatizaciones: {
    eyebrow: 'Automatización',
    title: 'Automatizaciones por etapa',
    description: 'Define reglas, alertas y acciones futuras por evento de selección.',
  },
  asignacion: {
    eyebrow: 'Capacitación',
    title: 'Asignación a capacitación',
    description: 'Consolida aptos no asignados y crea capacitaciones conectadas al flujo FDR.',
  },
  historial: {
    eyebrow: 'Historial',
    title: 'Historial de selección',
    description: 'Revisa actividad, cambios de estado y trazabilidad del proceso.',
  },
  catalogos: {
    eyebrow: 'Catálogos',
    title: 'Catálogos de Selección',
    description: 'Estados, etapas, fuentes y motivos base del proceso.',
  },
  configuracion: {
    eyebrow: 'Configuración',
    title: 'Configuración de Selección',
    description: 'Plantillas, etapas, SLA, scorecards, comunicaciones y permisos del módulo.',
  },
  reportes: {
    eyebrow: 'Reportes',
    title: 'Reportes de selección',
    description: 'Exporta convocatorias, postulantes, productividad, fuentes, SLA y auditoría.',
  },
  auditoria: {
    eyebrow: 'Auditoría',
    title: 'Auditoría de Selección',
    description: 'Consulta eventos críticos y trazabilidad de cambios.',
  },
};

const dropoutReasons = [
  'No aprobó entrevista de Recursos Humanos',
  'No aprobó entrevista con Supervisor o Coordinador',
  'No aprobó examen teórico',
  'No aprobó pruebas psicológicas',
  'No cumple con el perfil',
  'No cuenta con experiencia requerida',
  'No acepta las condiciones económicas',
  'No acepta el horario',
  'No acepta la modalidad de trabajo',
  'No acepta la ubicación',
  'Consiguió otra propuesta laboral',
  'Desistió del proceso',
  'No asistió a la entrevista',
  'No respondió llamadas o mensajes',
  'Datos incorrectos',
  'Duplicado',
  'No corresponde a la campaña',
  'Documentación incompleta',
  'Otro',
];

const requiresDropoutReason = (status?: string) =>
  [
    'No apto',
    'Desistió',
    'Ausente',
    'No corresponde',
    'No interesado',
    'Caído',
    'Desaprobado',
    'No continúa',
  ].some((term) => String(status || '').toLowerCase().includes(term.toLowerCase()));

const downloadTemplate = () => {
  const worksheet = XLSX.utils.aoa_to_sheet([excelHeaders]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Postulantes');
  XLSX.writeFile(workbook, 'plantilla-postulantes-seleccion.xlsx');
};

export default function Seleccion({ currentUser, users, initialView = 'dashboard', onPlatformDataChanged }: SeleccionProps) {
  const [activeView, setActiveView] = useState<ViewMode>(initialView);
  const [requisitions, setRequisitions] = useState<SelectionRequisition[]>([]);
  const [applicants, setApplicants] = useState<SelectionApplicant[]>([]);
  const [audit, setAudit] = useState<SelectionAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [selectedReqId, setSelectedReqId] = useState('');
  const [showReqModal, setShowReqModal] = useState(false);
  const [editingReq, setEditingReq] = useState<SelectionRequisition | null>(null);
  const [reqForm, setReqForm] = useState<Partial<SelectionRequisition>>(emptyRequisition);
  const [deleteTarget, setDeleteTarget] = useState<SelectionRequisition | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [applicantForm, setApplicantForm] = useState<Partial<SelectionApplicant>>({});
  const [editingApplicant, setEditingApplicant] = useState<SelectionApplicant | null>(null);
  const [deleteApplicantTarget, setDeleteApplicantTarget] = useState<SelectionApplicant | null>(null);
  const [deleteApplicantReason, setDeleteApplicantReason] = useState('');
  const [detailApplicant, setDetailApplicant] = useState<SelectionApplicant | null>(null);
  const [detailTab, setDetailTab] = useState('Resumen');
  const [importPreview, setImportPreview] = useState<Partial<SelectionApplicant>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [assignTarget, setAssignTarget] = useState<SelectionRequisition | null>(null);
  const [assignForm, setAssignForm] = useState<Record<string, string>>({});
  const [dashboardView, setDashboardView] = useState('Vista general');
  const [filterCampaign, setFilterCampaign] = useState('Todos');
  const [filterRecruiter, setFilterRecruiter] = useState('Todos');
  const [filterSource, setFilterSource] = useState('Todos');
  const [filterApplicantStatus, setFilterApplicantStatus] = useState('Todos');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [lastSync, setLastSync] = useState('');

  const recruiters = users.filter((user) => user.rol === 'Reclutador' && user.estado === 'Activo');
  const trainers = users.filter((user) => user.rol === 'Formador' && user.estado === 'Activo');
  const managers = users.filter((user) =>
    ['Administrador', 'Analista', 'Coordinador'].includes(user.rol) && user.estado === 'Activo',
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getSelectionBootstrap();
      setRequisitions(data.requisitions || []);
      setApplicants(data.applicants || []);
      setAudit(data.audit || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar Selección.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  const selectedReq = useMemo(
    () => requisitions.find((item) => item.id === selectedReqId) || requisitions[0],
    [requisitions, selectedReqId],
  );

  useEffect(() => {
    if (!selectedReqId && requisitions[0]) setSelectedReqId(requisitions[0].id);
  }, [requisitions, selectedReqId]);

  const visibleReqs = useMemo(() => {
    return requisitions.filter((req) => {
      const term = search.toLowerCase();
      const matchesSearch =
        req.nombre.toLowerCase().includes(term) ||
        req.codigo.toLowerCase().includes(term) ||
        req.cuenta.toLowerCase().includes(term) ||
        String(req.fuente_principal || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'Todos' || req.estado === statusFilter;
      const matchesCampaign = filterCampaign === 'Todos' || req.cuenta === filterCampaign;
      const matchesRecruiter = filterRecruiter === 'Todos' || req.reclutador_ids?.includes(filterRecruiter);
      const matchesSource = filterSource === 'Todos' || req.fuente_principal === filterSource;
      const matchesStart = !filterStartDate || req.fecha_inicio >= filterStartDate;
      const matchesEnd = !filterEndDate || req.fecha_fin <= filterEndDate;
      return matchesSearch && matchesStatus && matchesCampaign && matchesRecruiter && matchesSource && matchesStart && matchesEnd;
    });
  }, [filterCampaign, filterEndDate, filterRecruiter, filterSource, filterStartDate, requisitions, search, statusFilter]);

  const scopedApplicants = useMemo(() => {
    return applicants.filter((applicant) => {
      if (activeView === 'aptos') return applicant.ultimo_estado === 'Apto para capacitación';
      if (selectedReq?.id && activeView !== 'dashboard') return applicant.requisition_id === selectedReq.id;
      return true;
    });
  }, [activeView, applicants, selectedReq?.id]);

  const metrics = useMemo(() => {
    const reqIds = new Set(visibleReqs.map((req) => req.id));
    const scoped = applicants.filter((item) => {
      if (!reqIds.has(item.requisition_id)) return false;
      if (filterApplicantStatus !== 'Todos' && item.ultimo_estado !== filterApplicantStatus) return false;
      return true;
    });
    const total = scoped.length;
    const contacted = scoped.filter((item) => item.fecha_primera_gestion || ['Interesado', 'No interesado', 'No responde'].includes(item.ultimo_estado)).length;
    const managed = contacted;
    const interested = scoped.filter((item) => item.ultimo_estado === 'Interesado').length;
    const interviewed = scoped.filter((item) => item.entrevista === 'Realizada' || item.ultimo_estado.includes('Entrevista')).length;
    const evaluated = scoped.filter((item) => item.examen_teorico || item.pruebas_psic || item.entrevista_rh).length;
    const noApt = scoped.filter((item) => item.ultimo_estado === 'No apto').length;
    const dropped = scoped.filter((item) => ['No interesado', 'No responde', 'Caído'].includes(item.ultimo_estado)).length;
    const pending = scoped.filter((item) => item.ultimo_estado === 'Pendiente de gestión').length;
    const apt = scoped.filter((item) => item.ultimo_estado === 'Apto para capacitación' || item.ultimo_estado === 'Asignado a capacitación' || item.ultimo_estado === 'Alta en operación').length;
    const assigned = scoped.filter((item) => item.training_session_id || item.ultimo_estado === 'Asignado a capacitación').length;
    const trained = scoped.filter((item) => item.estado_capacitacion === 'Finalizó capacitación').length;
    const high = scoped.filter((item) => item.estado_alta_operacion === 'Alta en operación' || item.ultimo_estado === 'Alta en operación').length;
    const slaOk = scoped.filter((item) => item.cumple_sla).length;
    const slaTimes = scoped.map((item) => Number(item.tiempo_primera_gestion_min || 0)).filter(Boolean);
    const slaAverage = slaTimes.length ? Math.round(slaTimes.reduce((sum, value) => sum + value, 0) / slaTimes.length) : 0;
    const required = visibleReqs.reduce((sum, req) => sum + Number(req.vacantes || 0), 0);
    const active = visibleReqs.filter((req) => req.estado === 'Activa' || req.estado === 'En proceso').length;
    const finished = visibleReqs.filter((req) => req.estado === 'Finalizada').length;
    return {
      total,
      managed,
      contacted,
      interested,
      interviewed,
      evaluated,
      noApt,
      dropped,
      pending,
      apt,
      assigned,
      trained,
      high,
      slaOk,
      slaAverage,
      required,
      active,
      finished,
      requisitions: visibleReqs.length,
      coverage: percent(apt, required),
      aptConversion: percent(apt, total),
      trainingConversion: percent(assigned, apt),
      highConversion: percent(high, assigned),
      scoped,
    };
  }, [applicants, filterApplicantStatus, visibleReqs]);

  const viewMeta = selectionViewMeta[activeView] || selectionViewMeta.dashboard;
  const kanbanStages = ['Pendiente de gestión', 'Contactado', 'Citado', 'En evaluación', 'Apto para capacitación', 'Asignado a capacitación'];
  const aptosForTraining = metrics.scoped.filter((item) =>
    (item.ultimo_estado === 'Apto para capacitación' || item.ultimo_estado === 'Asignado a capacitación') &&
    !item.training_session_id &&
    !item.deleted_at,
  );

  const bulkUpdateApplicants = async (status: SelectionApplicantStatus) => {
    if (selectedApplicants.length === 0) return;
    const reason = requiresDropoutReason(status) ? window.prompt('Indica el motivo de no continuidad:') : '';
    if (requiresDropoutReason(status) && !reason?.trim()) return;
    setSaving(true);
    try {
      await Promise.all(selectedApplicants.map((id) =>
        updateSelectionApplicant(id, {
          ultimo_estado: status,
          etapa_actual: status,
          motivo_caida: reason || undefined,
        }),
      ));
      setSelectedApplicants([]);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo aplicar la acción masiva.');
    } finally {
      setSaving(false);
    }
  };

  const resetDashboardFilters = () => {
    setSearch('');
    setStatusFilter('Todos');
    setFilterCampaign('Todos');
    setFilterRecruiter('Todos');
    setFilterSource('Todos');
    setFilterApplicantStatus('Todos');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const syncSelection = async () => {
    await loadData();
    setLastSync(`${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })} por ${currentUser.nombre}`);
  };

  const exportDashboard = (format: 'xlsx' | 'csv') => {
    const rows = metrics.scoped.map((item) => ({
      convocatoria: item.requisition_codigo,
      reclutador: item.reclutador_nombre,
      dni: item.dni,
      postulante: item.nombre_completo,
      fuente: item.fuente,
      estado: item.ultimo_estado,
      telefono: item.telefono,
      correo: item.correo || '',
      fecha_registro: item.fecha_registro,
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Seleccion');
    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'reporte-seleccion.csv';
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    XLSX.writeFile(workbook, 'reporte-seleccion.xlsx');
  };
  const openNewRequisition = () => {
    setEditingReq(null);
    setReqForm({
      ...emptyRequisition,
      analista_id: currentUser.id,
      analista_nombre: currentUser.nombre,
      coordinador_id: managers.find((user) => user.rol === 'Coordinador')?.id,
      coordinador_nombre: managers.find((user) => user.rol === 'Coordinador')?.nombre,
    });
    setShowReqModal(true);
  };

  const openEditRequisition = (req: SelectionRequisition) => {
    setEditingReq(req);
    setReqForm(req);
    setShowReqModal(true);
  };

  const saveRequisition = async () => {
    try {
      setSaving(true);
      const selectedRecruiters = recruiters.filter((user) => reqForm.reclutador_ids?.includes(user.id));
      const payload = {
        ...reqForm,
        nombre: reqForm.nombre || `${reqForm.cuenta} ${reqForm.fecha_inicio || ''}`,
        cuenta: reqForm.cuenta || campaignOptions[0],
        fuente_principal: reqForm.fuente_principal || sourceOptions[0],
        posicion: reqForm.posicion || '',
        ciudad: reqForm.ciudad || '',
        vacantes: Number(reqForm.vacantes || 0),
        meta_leads: Number(reqForm.meta_leads || 0),
        sla_objetivo: Number(reqForm.sla_objetivo || 60),
        max_intentos_contacto: Number(reqForm.max_intentos_contacto || 3),
        seguimiento_max_horas: Number(reqForm.seguimiento_max_horas || 24),
        estado: reqForm.estado || 'Activa',
        reclutador_nombres: selectedRecruiters.map((user) => user.nombre),
      };
      if (!payload.cuenta || !payload.fuente_principal || !payload.fecha_inicio || !payload.fecha_fin) {
        alert('Completa campaña, fuente principal y fechas.');
        return;
      }
      if (String(payload.fecha_fin) < String(payload.fecha_inicio)) {
        alert('La fecha de fin no puede ser anterior a la fecha de inicio.');
        return;
      }
      if (payload.vacantes <= 0 || !Number.isInteger(payload.vacantes)) {
        alert('La cantidad de posiciones requeridas debe ser un entero mayor que cero.');
        return;
      }
      if (!payload.reclutador_ids?.length) {
        alert('Selecciona al menos un reclutador asignado.');
        return;
      }
      if (!canEditRequisitionCode(currentUser.rol)) {
        delete payload.codigo;
        delete payload.codigo_base;
      }
      if (editingReq) {
        const response = await updateSelectionRequisition(editingReq.id, payload);
        setRequisitions((prev) => prev.map((item) => item.id === editingReq.id ? { ...item, ...response.changes } : item));
      } else {
        const response = await createSelectionRequisition(payload);
        setRequisitions((prev) => [response.requisition, ...prev]);
        setSelectedReqId(response.requisition.id);
      }
      setShowReqModal(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar la convocatoria.');
    } finally {
      setSaving(false);
    }
  };
  const removeRequisition = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await deleteSelectionRequisition(deleteTarget.id, deleteReason);
      setDeleteTarget(null);
      setDeleteReason('');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar la convocatoria.');
    } finally {
      setSaving(false);
    }
  };

  const openNewApplicant = (req = selectedReq) => {
    if (!req) return;
    setEditingApplicant(null);
    setApplicantForm({
      requisition_id: req.id,
      cuenta: req.cuenta,
      posicion: req.posicion,
      ciudad: req.ciudad,
      fuente: req.fuente_principal,
      reclutador_id: currentUser.rol === 'Reclutador' ? currentUser.id : req.reclutador_ids[0],
      reclutador_nombre: currentUser.rol === 'Reclutador' ? currentUser.nombre : req.reclutador_nombres[0],
      ultimo_estado: 'Pendiente de gestión',
    });
    setShowApplicantModal(true);
  };

  const openEditApplicant = (applicant: SelectionApplicant) => {
    setEditingApplicant(applicant);
    setApplicantForm(applicant);
    setShowApplicantModal(true);
  };

  const saveApplicant = async () => {
    if (!selectedReq && !applicantForm.requisition_id) return;
    const reqId = String(applicantForm.requisition_id || selectedReq?.id);
    try {
      setSaving(true);
      const recruiter = recruiters.find((user) => user.id === applicantForm.reclutador_id);
      const payload = {
        ...applicantForm,
        dni: String(applicantForm.dni || '').replace(/\D/g, ''),
        telefono: String(applicantForm.telefono || '').replace(/\D/g, ''),
        cuenta: applicantForm.cuenta || selectedReq?.cuenta || '',
        fuente: applicantForm.fuente || selectedReq?.fuente_principal || sourceOptions[0],
        reclutador_nombre: currentUser.rol === 'Reclutador' ? currentUser.nombre : recruiter?.nombre || applicantForm.reclutador_nombre,
      };
      if (!payload.dni || !payload.nombre_completo || !payload.telefono) {
        alert('DNI, nombre y teléfono son obligatorios.');
        return;
      }
      if (!/^\d{8}$/.test(payload.dni)) {
        alert('El DNI debe tener 8 dígitos.');
        return;
      }
      if (!/^\d{9}$/.test(payload.telefono)) {
        alert('El celular debe tener 9 dígitos.');
        return;
      }
      if (payload.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.correo))) {
        alert('El correo electrónico no tiene un formato válido.');
        return;
      }
      if (requiresDropoutReason(payload.ultimo_estado) && !String(payload.motivo_caida || '').trim()) {
        alert('Indica el motivo de no continuidad antes de guardar.');
        return;
      }
      if (payload.motivo_caida === 'Otro' && !String(payload.submotivo_caida || '').trim()) {
        alert('Detalla el motivo cuando selecciones Otro.');
        return;
      }
      if (editingApplicant) {
        await updateSelectionApplicant(editingApplicant.id, payload);
      } else {
        await createSelectionApplicant(reqId, payload);
      }
      setShowApplicantModal(false);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el postulante.');
    } finally {
      setSaving(false);
    }
  };
  const updateApplicantStatus = async (applicant: SelectionApplicant, status: SelectionApplicantStatus) => {
    const needsReason = requiresDropoutReason(status);
    const reason = needsReason ? window.prompt('Indica el motivo de no continuidad:') : '';
    if (needsReason && !reason?.trim()) return;
    const nextFollowUp = status === 'No responde'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : applicant.proximo_seguimiento;
    await updateSelectionApplicant(applicant.id, {
      ultimo_estado: status,
      etapa_actual: status,
      motivo_caida: reason || applicant.motivo_caida,
      intentos_contacto: status === 'No responde' ? (applicant.intentos_contacto || 0) + 1 : applicant.intentos_contacto,
      proximo_seguimiento: nextFollowUp,
    });
    await loadData();
  };

  const removeApplicant = async () => {
    if (!deleteApplicantTarget) return;
    try {
      setSaving(true);
      await deleteSelectionApplicant(deleteApplicantTarget.id, deleteApplicantReason.trim());
      setDeleteApplicantTarget(null);
      setDeleteApplicantReason('');
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo eliminar el postulante.');
    } finally {
      setSaving(false);
    }
  };

  const handleExcel = async (file?: File) => {
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
    const parsed: Partial<SelectionApplicant>[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      const mapped: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        const mappedKey = headerMap[normalizeHeader(key)];
        if (mappedKey) mapped[mappedKey] = value;
      });
      if (!mapped.dni || !mapped.nombre_completo || !mapped.telefono) {
        errors.push(`Fila ${index + 2}: faltan DNI, nombre o teléfono.`);
      }
      parsed.push({
        ...mapped,
        dni: String(mapped.dni || '').trim(),
        nombre_completo: String(mapped.nombre_completo || '').trim(),
        telefono: String(mapped.telefono || '').trim(),
      } as Partial<SelectionApplicant>);
    });
    setImportPreview(parsed);
    setImportErrors(errors);
  };

  const confirmImport = async () => {
    if (!selectedReq || importPreview.length === 0) return;
    try {
      setSaving(true);
      const response = await importSelectionApplicants(selectedReq.id, importPreview);
      alert(`Carga completada. Creados: ${response.created.length}. Omitidos: ${response.skipped.length}.`);
      setImportPreview([]);
      setImportErrors([]);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo importar el archivo.');
    } finally {
      setSaving(false);
    }
  };

  const openAssignTraining = (req: SelectionRequisition) => {
    const aptos = applicants.filter(
      (item) => item.requisition_id === req.id && item.ultimo_estado === 'Apto para capacitación' && !item.training_session_id,
    );
    setSelectedApplicants(aptos.map((item) => item.id));
    setAssignTarget(req);
    setAssignForm({
      formador_id: req.training_formador_id || trainers[0]?.id || '',
      formador_nombre: req.training_formador_nombre || trainers[0]?.nombre || '',
      fecha_inicio: req.training_fecha_inicio || '',
      fecha_fin: req.training_fecha_fin || '',
      hora_capacitacion: req.training_hora || '08:00',
      modalidad: req.training_modalidad || 'Presencial',
      tipo_capacitacion: req.training_tipo || 'Capacitación regular',
    });
  };

  const assignTraining = async () => {
    if (!assignTarget || selectedApplicants.length === 0) return;
    try {
      setSaving(true);
      const trainer = trainers.find((user) => user.id === assignForm.formador_id);
      await assignSelectionToTraining(assignTarget.id, selectedApplicants, {
        ...assignForm,
        formador_nombre: trainer?.nombre || assignForm.formador_nombre,
      });
      setAssignTarget(null);
      setSelectedApplicants([]);
      await loadData();
      onPlatformDataChanged?.();
      alert('Capacitación creada y postulantes asignados correctamente.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo asignar a capacitación.');
    } finally {
      setSaving(false);
    }
  };

  const renderKpi = (label: string, value: number | string, icon: React.ReactNode, tone = 'indigo') => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
        tone === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
        tone === 'fuchsia' ? 'bg-fuchsia-50 text-fuchsia-600' :
        tone === 'blue' ? 'bg-blue-50 text-blue-600' :
        tone === 'amber' ? 'bg-amber-50 text-amber-600' :
        'bg-indigo-50 text-indigo-600'
      }`}>
        {icon}
      </div>
      <p className="text-[11px] uppercase tracking-widest font-black text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-1">{value}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Cargando módulo de Selección...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-col xl:flex-row xl:items-center ${activeView === 'convocatorias' ? 'justify-end' : 'justify-between'} gap-4`}>
        {activeView !== 'convocatorias' && (
          <div>
            <span className="text-[10px] text-fuchsia-600 font-black uppercase tracking-widest">{viewMeta.eyebrow}</span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {viewMeta.title}
            </h2>
            <p className="text-slate-500 text-sm">{viewMeta.description}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {canCreateRequisition(currentUser.rol) && (
            <button
              onClick={openNewRequisition}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-black shadow-md"
            >
              <Plus className="w-4 h-4" />
              Crear convocatoria
            </button>
          )}
          <button
            onClick={() => void syncSelection()}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold"
          >
            <History className="w-4 h-4" />
            Sincronizar
          </button>
        </div>
      </div>

      {lastSync && activeView === 'dashboard' && (
        <p className="text-xs text-slate-400 -mt-3">Última sincronización: {lastSync}</p>
      )}

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm font-semibold flex gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {activeView === 'dashboard' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs grid md:grid-cols-4 xl:grid-cols-6 gap-3">
            <select value={dashboardView} onChange={(event) => setDashboardView(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              {dashboardViews.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input type="date" value={filterStartDate} onChange={(event) => setFilterStartDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={filterEndDate} onChange={(event) => setFilterEndDate(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <select value={filterCampaign} onChange={(event) => setFilterCampaign(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              <option>Todos</option>
              {campaignOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={filterRecruiter} onChange={(event) => setFilterRecruiter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              <option value="Todos">Todos los reclutadores</option>
              {recruiters.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              <option>Todos</option>
              {finalRequisitionStates.map((item) => <option key={item}>{item}</option>)}
              <option>Vencida</option>
            </select>
            <select value={filterSource} onChange={(event) => setFilterSource(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              <option>Todos</option>
              {sourceOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={filterApplicantStatus} onChange={(event) => setFilterApplicantStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">
              <option>Todos</option>
              {applicantStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select value={selectedReqId} onChange={(event) => setSelectedReqId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold md:col-span-2">
              {requisitions.map((req) => <option key={req.id} value={req.id}>{req.codigo} · {req.nombre}</option>)}
            </select>
            <button onClick={resetDashboardFilters} className="rounded-xl bg-slate-100 text-slate-700 px-3 py-2 text-sm font-black">Limpiar filtros</button>
            <button onClick={() => exportDashboard('xlsx')} className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-sm font-black">Excel</button>
            <button onClick={() => exportDashboard('csv')} className="rounded-xl bg-emerald-600 text-white px-3 py-2 text-sm font-black">CSV</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {renderKpi('Convocatorias', metrics.requisitions, <BriefcaseBusiness className="w-5 h-5" />, 'indigo')}
            {renderKpi('Activas', metrics.active, <Calendar className="w-5 h-5" />, 'emerald')}
            {renderKpi('Finalizadas', metrics.finished, <CheckCircle2 className="w-5 h-5" />, 'blue')}
            {renderKpi('Posiciones requeridas', metrics.required, <Users className="w-5 h-5" />, 'amber')}
            {renderKpi('Postulantes', metrics.total, <Users className="w-5 h-5" />, 'indigo')}
            {renderKpi('Contactados', metrics.contacted, <UserCheck className="w-5 h-5" />, 'emerald')}
            {renderKpi('Interesados', metrics.interested, <CheckCircle2 className="w-5 h-5" />, 'blue')}
            {renderKpi('Entrevistados', metrics.interviewed, <BriefcaseBusiness className="w-5 h-5" />, 'indigo')}
            {renderKpi('Aptos', metrics.apt, <CheckCircle2 className="w-5 h-5" />, 'fuchsia')}
            {renderKpi('No aptos', metrics.noApt, <AlertTriangle className="w-5 h-5" />, 'amber')}
            {renderKpi('Desistidos', metrics.dropped, <AlertTriangle className="w-5 h-5" />, 'amber')}
            {renderKpi('Cobertura', `${metrics.coverage}%`, <BarChart3 className="w-5 h-5" />, 'emerald')}
          </div>

          <div className="grid xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-fuchsia-600" /> Embudo de selección</h3>
              {[
                ['Postulantes registrados', metrics.total],
                ['Contactados', metrics.contacted],
                ['Interesados', metrics.interested],
                ['Entrevistados', metrics.interviewed],
                ['Evaluados', metrics.evaluated],
                ['Aptos', metrics.apt],
                ['Asignados a capacitación', metrics.assigned],
                ['Capacitados', metrics.trained],
                ['Altas a operación', metrics.high],
              ].map(([label, value], index, arr) => {
                const previous = index === 0 ? Number(value) : Number(arr[index - 1][1]);
                return (
                  <div key={String(label)} className="mb-3">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-1"><span>{label}</span><span>{value} · conv. {percent(Number(value), previous || Number(value) || 1)}%</span></div>
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500" style={{ width: `${Math.max(4, percent(Number(value), metrics.total || Number(value) || 1))}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-black text-slate-900 mb-4">Conversión</h3>
              <div className="space-y-3 text-sm">
                <p className="flex justify-between"><span>Apto / postulante</span><strong>{metrics.aptConversion}%</strong></p>
                <p className="flex justify-between"><span>Apto / capacitación</span><strong>{metrics.trainingConversion}%</strong></p>
                <p className="flex justify-between"><span>Capacitación / alta</span><strong>{metrics.highConversion}%</strong></p>
                <p className="flex justify-between"><span>SLA promedio</span><strong>{metrics.slaAverage} min</strong></p>
                <p className="flex justify-between"><span>Pendientes</span><strong>{metrics.pending}</strong></p>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-black text-slate-900 mb-4">Barras por campaña</h3>
              {campaignOptions.map((campaign) => {
                const reqs = visibleReqs.filter((req) => req.cuenta === campaign);
                const reqIds = new Set(reqs.map((req) => req.id));
                const rows = metrics.scoped.filter((item) => reqIds.has(item.requisition_id));
                const aptos = rows.filter((item) => item.ultimo_estado.includes('Apto') || item.training_session_id).length;
                const required = reqs.reduce((sum, req) => sum + Number(req.vacantes || 0), 0);
                return <div key={campaign} className="mb-3"><div className="flex justify-between text-xs font-bold"><span>{campaign}</span><span>{aptos}/{required || rows.length}</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, percent(aptos, required || rows.length || 1))}%` }} /></div></div>;
              })}
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="font-black text-slate-900 mb-4">Fuentes de reclutamiento</h3>
              {sourceOptions.map((source) => {
                const rows = metrics.scoped.filter((item) => item.fuente === source);
                const aptos = rows.filter((item) => item.ultimo_estado.includes('Apto') || item.training_session_id).length;
                return <div key={source} className="mb-3"><div className="flex justify-between text-xs font-bold"><span>{source}</span><span>{rows.length} · {percent(aptos, rows.length)}%</span></div><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${Math.max(3, percent(rows.length, metrics.total || 1))}%` }} /></div></div>;
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100"><h3 className="font-black text-slate-900">Ranking por reclutador</h3></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="p-3 text-left">#</th><th className="p-3 text-left">Reclutador</th><th className="p-3">Convocatorias</th><th className="p-3">Postulantes</th><th className="p-3">Aptos</th><th className="p-3">Altas</th><th className="p-3">Conv. apto</th><th className="p-3">Cobertura</th><th className="p-3">Estado</th></tr></thead><tbody className="divide-y divide-slate-100">
              {recruiters.map((recruiter, index) => {
                const assignedReqs = visibleReqs.filter((req) => req.reclutador_ids?.includes(recruiter.id));
                const reqIds = new Set(assignedReqs.map((req) => req.id));
                const mine = metrics.scoped.filter((item) => item.reclutador_id === recruiter.id || reqIds.has(item.requisition_id));
                const aptos = mine.filter((item) => item.ultimo_estado.includes('Apto') || item.training_session_id).length;
                const highs = mine.filter((item) => item.estado_alta_operacion === 'Alta en operación').length;
                const required = assignedReqs.reduce((sum, req) => sum + Number(req.vacantes || 0), 0);
                const coverage = percent(aptos, required);
                return <tr key={recruiter.id}><td className="p-3 font-black">{index + 1}</td><td className="p-3 font-bold text-slate-800">{recruiter.nombre}</td><td className="p-3 text-center">{assignedReqs.length}</td><td className="p-3 text-center">{mine.length}</td><td className="p-3 text-center">{aptos}</td><td className="p-3 text-center">{highs}</td><td className="p-3 text-center">{percent(aptos, mine.length)}%</td><td className="p-3 text-center">{coverage}%</td><td className="p-3 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-black ${coverage >= 80 ? 'bg-emerald-50 text-emerald-700' : coverage >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{coverage >= 80 ? 'En meta' : coverage >= 50 ? 'En avance' : 'En riesgo'}</span></td></tr>;
              })}
            </tbody></table></div>
          </div>
        </div>
      )}
      {activeView !== 'dashboard' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar convocatoria, postulante, DNI, cuenta..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-hidden focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
            >
              <option>Todos</option>
              <option>Activa</option>
              <option>En proceso</option>
              <option>Pendiente de asignación a capacitación</option>
              <option>Parcialmente asignada a capacitación</option>
              <option>Finalizada</option>
              <option>Eliminada</option>
            </select>
            {selectedReq && activeView !== 'convocatorias' && (
              <select
                value={selectedReqId}
                onChange={(event) => setSelectedReqId(event.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
              >
                {requisitions.map((req) => (
                  <option key={req.id} value={req.id}>{req.codigo} · {req.nombre}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      {selectedApplicants.length > 0 && (
        <div className="sticky top-3 z-30 bg-slate-950 text-white rounded-2xl shadow-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-black">{selectedApplicants.length} postulantes seleccionados</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void bulkUpdateApplicants('Contactado')} disabled={saving} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black">Marcar contactado</button>
            <button onClick={() => void bulkUpdateApplicants('Citado')} disabled={saving} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black">Citar</button>
            <button onClick={() => void bulkUpdateApplicants('No apto')} disabled={saving} className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-black">Descartar</button>
            <button onClick={() => setSelectedApplicants([])} className="px-3 py-2 rounded-xl bg-white text-slate-900 text-xs font-black">Limpiar</button>
          </div>
        </div>
      )}

      {activeView === 'convocatorias' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleReqs.map((req) => {
            const reqApplicants = applicants.filter((item) => item.requisition_id === req.id);
            const apt = reqApplicants.filter((item) => item.ultimo_estado === 'Apto para capacitación' || item.training_session_id).length;
            const highs = reqApplicants.filter((item) => item.estado_alta_operacion === 'Alta en operación').length;
            const required = Number(req.vacantes || 0);
            const coverage = percent(apt, required);
            const canEditThis = isManagerRole(currentUser.rol) || req.reclutador_ids?.includes(currentUser.id);
            const daysLeft = getDaysLeft(req.fecha_fin);
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className={`h-1 ${req.estado === 'Finalizada' ? 'bg-slate-400' : daysLeft < 0 ? 'bg-rose-500' : daysLeft <= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{req.codigo}</span>
                      <h3 className="text-lg font-black text-slate-900 mt-3">{req.codigo}</h3>
                      <p className="text-sm text-slate-500">{req.cuenta} · {req.fuente_principal || 'Sin fuente'}</p>
                    </div>
                    <div className="flex gap-1">
                      {canEditThis && (
                        <button onClick={() => openEditRequisition(req)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {canEditThis && (
                        <button onClick={() => setDeleteTarget(req)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 font-black uppercase">Posiciones</p>
                      <p className="text-xl font-black text-slate-900">{required}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <p className="text-[10px] text-emerald-600 font-black uppercase">Aptos</p>
                      <p className="text-xl font-black text-emerald-800">{apt}</p>
                    </div>
                    <div className="bg-indigo-50 rounded-xl p-3">
                      <p className="text-[10px] text-indigo-600 font-black uppercase">Altas</p>
                      <p className="text-xl font-black text-indigo-800">{highs}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 text-xs text-slate-500">
                    <p className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {req.fecha_inicio} al {req.fecha_fin} · {daysLeft >= 0 ? `${daysLeft} días restantes` : 'Vencida'}</p>
                    <p className="flex items-center gap-2"><Users className="w-4 h-4" /> {req.reclutador_nombres.join(', ') || 'Sin reclutadores'}</p>
                    <div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                        <span>Cobertura</span>
                        <span>{coverage}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-600" style={{ width: `${Math.min(100, coverage)}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => { setSelectedReqId(req.id); setActiveView('postulantes'); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black">
                      Gestionar postulantes
                    </button>
                    {apt > 0 && isManagerRole(currentUser.rol) && (
                      <button onClick={() => openAssignTraining(req)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-black">
                        Asignar capacitación
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeView === 'seguimientos' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-6 gap-4 items-start">
          {kanbanStages.map((stage) => {
            const rows = metrics.scoped.filter((item) => item.ultimo_estado === stage || item.etapa_actual === stage);
            return (
              <section key={stage} className="bg-white rounded-2xl border border-slate-200 shadow-xs min-h-80">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 text-sm">{stage}</h3>
                  <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-500">{rows.length}</span>
                </div>
                <div className="p-3 space-y-3">
                  {rows.length === 0 && <p className="text-xs text-slate-400 italic p-3">Sin postulantes en esta etapa.</p>}
                  {rows.map((applicant) => (
                    <article key={applicant.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 hover:bg-white hover:shadow-md transition">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900 text-sm">{applicant.nombre_completo}</p>
                          <p className="text-[11px] text-slate-500 font-mono">DNI {applicant.dni}</p>
                        </div>
                        <button onClick={() => { setDetailApplicant(applicant); setDetailTab('Resumen'); }} className="text-slate-400 hover:text-indigo-600">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{applicant.reclutador_nombre}</p>
                      <div className="mt-3">
                        <select value={applicant.ultimo_estado} onChange={(event) => void updateApplicantStatus(applicant, event.target.value as SelectionApplicantStatus)} className="w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold">
                          {applicantStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {['postulantes', 'evaluaciones', 'aptos', 'historial'].includes(activeView) && selectedReq && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap gap-2 items-center justify-between">
            <div>
              <p className="text-xs font-black text-indigo-600 uppercase">{selectedReq.codigo}</p>
              <h3 className="font-black text-slate-900">{selectedReq.nombre}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => openNewApplicant(selectedReq)} className="bg-fuchsia-600 text-white px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1">
                <Plus className="w-4 h-4" /> Registrar postulante
              </button>
              <label className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1 cursor-pointer">
                <FileSpreadsheet className="w-4 h-4" /> Cargar Excel
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => void handleExcel(event.target.files?.[0])} />
              </label>
              <button onClick={downloadTemplate} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1">
                <Download className="w-4 h-4" /> Plantilla
              </button>
            </div>
          </div>

          {importPreview.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="font-black text-slate-900">Vista previa de importación</h4>
                  <p className="text-xs text-slate-500">{importPreview.length} filas leídas · {importErrors.length} advertencias</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setImportPreview([])} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-black">Cancelar</button>
                  <button onClick={() => void confirmImport()} disabled={saving} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-black">Confirmar importación</button>
                </div>
              </div>
              {importErrors.length > 0 && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 mb-3">
                  {importErrors.slice(0, 5).map((item) => <p key={item}>{item}</p>)}
                </div>
              )}
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase">
                    <tr><th className="p-2 text-left">DNI</th><th className="p-2 text-left">Nombre</th><th className="p-2 text-left">Teléfono</th><th className="p-2 text-left">Fuente</th></tr>
                  </thead>
                  <tbody>
                    {importPreview.slice(0, 20).map((item, index) => (
                      <tr key={`${item.dni}-${index}`} className="border-t border-slate-100">
                        <td className="p-2 font-mono">{item.dni}</td>
                        <td className="p-2">{item.nombre_completo}</td>
                        <td className="p-2">{item.telefono}</td>
                        <td className="p-2">{item.fuente}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="p-3 text-left">Postulante</th>
                    <th className="p-3 text-left">Contacto</th>
                    <th className="p-3 text-left">Reclutador</th>
                    <th className="p-3 text-left">Estado</th>
                    <th className="p-3 text-left">SLA</th>
                    <th className="p-3 text-left">Seguimiento</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scopedApplicants.map((applicant) => (
                    <tr key={applicant.id} className="hover:bg-slate-50/60">
                      <td className="p-3">
                        <p className="font-black text-slate-900">{applicant.nombre_completo}</p>
                        <p className="text-xs text-slate-400 font-mono">DNI {applicant.dni} · {applicant.codigo}</p>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        <p>{applicant.telefono}</p>
                        <p>{applicant.correo || '-'}</p>
                      </td>
                      <td className="p-3 text-xs font-bold text-slate-600">{applicant.reclutador_nombre}</td>
                      <td className="p-3">
                        <select
                          value={applicant.ultimo_estado}
                          onChange={(event) => void updateApplicantStatus(applicant, event.target.value as SelectionApplicantStatus)}
                          className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-black"
                        >
                          {applicantStatuses.map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                          applicant.fecha_primera_gestion
                            ? applicant.cumple_sla ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {applicant.fecha_primera_gestion ? applicant.cumple_sla ? 'Cumple' : 'Fuera SLA' : 'Sin gestión'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {applicant.proximo_seguimiento ? new Date(applicant.proximo_seguimiento).toLocaleString('es-PE') : '-'}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <button onClick={() => { setDetailApplicant(applicant); setDetailTab('Resumen'); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditApplicant(applicant)} className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setSelectedApplicants((prev) => prev.includes(applicant.id) ? prev.filter((id) => id !== applicant.id) : [...prev, applicant.id])} className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteApplicantTarget(applicant)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeView === 'agenda' && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900">Próximas citaciones y seguimientos</h3>
              <span className="text-xs font-black text-slate-400">{metrics.scoped.filter((item) => item.proximo_seguimiento).length} programados</span>
            </div>
            <div className="divide-y divide-slate-100">
              {metrics.scoped.filter((item) => item.proximo_seguimiento || item.ultimo_estado === 'Citado').slice(0, 30).map((item) => (
                <button key={item.id} onClick={() => { setDetailApplicant(item); setDetailTab('Citaciones'); }} className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{item.nombre_completo}</p>
                    <p className="text-xs text-slate-500">{item.requisition_codigo} · {item.reclutador_nombre}</p>
                  </div>
                  <span className="text-xs font-black text-indigo-600">{item.proximo_seguimiento ? new Date(item.proximo_seguimiento).toLocaleString('es-PE') : 'Citado'}</span>
                </button>
              ))}
              {metrics.scoped.filter((item) => item.proximo_seguimiento || item.ultimo_estado === 'Citado').length === 0 && (
                <p className="p-8 text-center text-sm text-slate-400 italic">No hay citaciones o próximos seguimientos registrados.</p>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-black text-slate-900">Estados de agenda</h3>
            {['Programada', 'Confirmada', 'Reprogramada', 'Asistió', 'Ausente', 'Cancelada'].map((item) => (
              <div key={item} className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <span className="text-sm font-bold text-slate-700">{item}</span>
                <span className="text-xs font-black text-slate-400">0</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'base' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900">Base consolidada</h3>
            <button onClick={() => exportDashboard('xlsx')} className="rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-black">Exportar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
                <tr><th className="p-3 text-left">Postulante</th><th className="p-3 text-left">Contacto</th><th className="p-3 text-left">Última convocatoria</th><th className="p-3 text-left">Fuente</th><th className="p-3 text-left">Estado</th><th className="p-3 text-center">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.scoped.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="p-3 font-black text-slate-900">{item.nombre_completo}<p className="text-xs text-slate-400 font-mono">DNI {item.dni}</p></td>
                    <td className="p-3 text-xs text-slate-500">{item.telefono}<br />{item.correo || '-'}</td>
                    <td className="p-3 text-xs font-bold text-slate-600">{item.requisition_codigo}</td>
                    <td className="p-3 text-xs text-slate-500">{item.fuente}</td>
                    <td className="p-3"><span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black">{item.ultimo_estado}</span></td>
                    <td className="p-3 text-center"><button onClick={() => { setDetailApplicant(item); setDetailTab('Historial'); }} className="text-indigo-600 text-xs font-black">Abrir ficha</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === 'automatizaciones' && (
        <div className="grid lg:grid-cols-3 gap-4">
          {[
            ['Distribución', 'Reparto equitativo, cuotas, campaña, ciudad y carga de trabajo.'],
            ['SLA', 'Alertas por próximo vencimiento, vencido y escalamiento.'],
            ['Contactabilidad', 'Intentos, próximos contactos y detección de no respuesta.'],
            ['Citaciones', 'Recordatorios, confirmaciones y ausencias.'],
            ['Evaluación', 'Cálculo de aptitud, scorecard y criterios críticos.'],
            ['Capacitación', 'Aptos sin asignar, creación de capa y notificación.'],
          ].map(([title, text]) => (
            <section key={title} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">{title}</h3>
                <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Preparado</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">{text}</p>
              <button disabled className="mt-4 rounded-xl bg-slate-100 text-slate-400 px-3 py-2 text-xs font-black cursor-not-allowed">Configurar en siguiente fase</button>
            </section>
          ))}
        </div>
      )}

      {activeView === 'asignacion' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex flex-wrap justify-between gap-3 mb-4">
            <div>
              <h3 className="font-black text-slate-900">Aptos pendientes de asignación</h3>
              <p className="text-sm text-slate-500">Selecciona postulantes aptos y usa “Asignar capacitación” desde la convocatoria correspondiente.</p>
            </div>
            <span className="rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-black">{aptosForTraining.length} disponibles</span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {aptosForTraining.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-black text-slate-900">{item.nombre_completo}</p>
                <p className="text-xs text-slate-500 mt-1">DNI {item.dni} · {item.requisition_codigo}</p>
                <p className="text-xs text-slate-500">{item.reclutador_nombre}</p>
                <button onClick={() => setSelectedApplicants((prev) => prev.includes(item.id) ? prev : [...prev, item.id])} className="mt-3 rounded-xl bg-indigo-600 text-white px-3 py-2 text-xs font-black">Seleccionar</button>
              </article>
            ))}
          </div>
          {aptosForTraining.length === 0 && <p className="text-sm text-slate-400 italic">No hay aptos pendientes de asignación con los filtros actuales.</p>}
        </div>
      )}

      {(activeView === 'configuracion' || activeView === 'catalogos') && (
        <div className="grid lg:grid-cols-2 gap-4">
          {[
            ['Plantillas de convocatorias', 'Crear desde plantillas por campaña o convocatoria anterior.'],
            ['Etapas y estados', 'Orden, colores, SLA y campos obligatorios por etapa.'],
            ['Scorecards', 'Criterios de call center, ventas, comunicación y disponibilidad.'],
            ['Fuentes y motivos de caída', 'Catálogos base para datos consistentes.'],
            ['Comunicaciones', 'Plantillas de correo, citación, recordatorio y resultado.'],
            ['Políticas y tratamiento de datos', enableDataPolicyModule ? 'Módulo habilitado.' : 'Cascarón técnico creado y deshabilitado por feature flag.'],
          ].map(([title, text]) => (
            <section key={title} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">{title}</h3>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${title.includes('Políticas') ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-700'}`}>{title.includes('Políticas') ? 'Oculto' : 'Base'}</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">{text}</p>
            </section>
          ))}
        </div>
      )}

      {activeView === 'reportes' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-black text-slate-900 mb-2">Reportes exportables</h3>
          <p className="text-sm text-slate-500 mb-4">Exporta los datos visibles respetando filtros activos.</p>
          <button
            onClick={() => {
              const worksheet = XLSX.utils.json_to_sheet(scopedApplicants);
              const workbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(workbook, worksheet, 'Postulantes');
              XLSX.writeFile(workbook, 'reporte-seleccion.xlsx');
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-black inline-flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar postulantes
          </button>
        </div>
      )}

      {activeView === 'auditoria' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500">
              <tr><th className="p-3 text-left">Fecha</th><th className="p-3 text-left">Usuario</th><th className="p-3 text-left">Acción</th><th className="p-3 text-left">Registro</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {audit.map((item) => (
                <tr key={item.id}>
                  <td className="p-3 text-xs text-slate-500">{new Date(item.created_at).toLocaleString('es-PE')}</td>
                  <td className="p-3 font-bold text-slate-700">{item.user_name}</td>
                  <td className="p-3">{item.action}</td>
                  <td className="p-3 text-slate-500">{item.entity_name || item.entity_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailApplicant && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex justify-end">
          <aside className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-5 z-10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white flex items-center justify-center font-black">
                    {detailApplicant.nombre_completo.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-xl">{detailApplicant.nombre_completo}</h3>
                    <p className="text-xs text-slate-500">DNI {detailApplicant.dni} · {detailApplicant.requisition_codigo}</p>
                  </div>
                </div>
                <button onClick={() => setDetailApplicant(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Resumen', 'Gestiones', 'Evaluaciones', 'Citaciones', 'Comunicaciones', 'Documentos', 'Historial', 'Auditoría'].map((tab) => (
                  <button key={tab} onClick={() => setDetailTab(tab)} className={`px-3 py-2 rounded-xl text-xs font-black ${detailTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black text-slate-400 uppercase">Estado</p><p className="font-black text-slate-900">{detailApplicant.ultimo_estado}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black text-slate-400 uppercase">Reclutador</p><p className="font-black text-slate-900">{detailApplicant.reclutador_nombre}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-[10px] font-black text-slate-400 uppercase">SLA</p><p className="font-black text-slate-900">{detailApplicant.fecha_primera_gestion ? detailApplicant.cumple_sla ? 'Cumple' : 'Fuera SLA' : 'Sin gestión'}</p></div>
              </div>
              {detailTab === 'Resumen' && (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  {[
                    ['Celular', detailApplicant.telefono],
                    ['Correo', detailApplicant.correo || '-'],
                    ['Fuente', detailApplicant.fuente],
                    ['Campaña', detailApplicant.cuenta],
                    ['Ciudad', detailApplicant.ciudad || '-'],
                    ['Fecha de carga', new Date(detailApplicant.fecha_registro).toLocaleString('es-PE')],
                    ['Motivo', detailApplicant.motivo_caida || '-'],
                    ['Observaciones', detailApplicant.observaciones || '-'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                      <p className="font-bold text-slate-800 mt-1">{value}</p>
                    </div>
                  ))}
                </div>
              )}
              {detailTab !== 'Resumen' && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="font-black text-slate-800">{detailTab}</p>
                  <p className="text-sm text-slate-500 mt-2">La estructura de esta pestaña está lista para recibir registros específicos en la siguiente fase.</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <button onClick={() => openEditApplicant(detailApplicant)} className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-black">Editar</button>
                <button onClick={() => void updateApplicantStatus(detailApplicant, 'Contactado')} className="rounded-xl bg-slate-100 text-slate-700 px-4 py-2 text-sm font-black">Registrar gestión</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {showReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-t-3xl">
              <div>
                <h3 className="text-xl font-black">{editingReq ? 'Editar convocatoria' : 'Crear convocatoria'}</h3>
                <p className="text-xs text-white/80">Gestiona apertura, reclutadores, posiciones requeridas y estado.</p>
              </div>
              <button onClick={() => setShowReqModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="text-xs font-black text-slate-500 md:col-span-2">
                Código de convocatoria
                <input
                  value={reqForm.codigo || 'Se generará automáticamente'}
                  disabled={!canEditRequisitionCode(currentUser.rol) || !editingReq}
                  onChange={(event) => setReqForm((prev) => ({ ...prev, codigo: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 font-mono font-bold"
                />
              </label>
              <label className="text-xs font-black text-slate-500">
                Campaña
                <select value={reqForm.cuenta || campaignOptions[0]} onChange={(event) => setReqForm((prev) => ({ ...prev, cuenta: event.target.value, nombre: prev.nombre || event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  {campaignOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Fuente principal
                <select value={reqForm.fuente_principal || sourceOptions[0]} onChange={(event) => setReqForm((prev) => ({ ...prev, fuente_principal: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  {sourceOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Fecha de inicio
                <input type="date" value={reqForm.fecha_inicio || ''} onChange={(event) => setReqForm((prev) => ({ ...prev, fecha_inicio: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" />
              </label>
              <label className="text-xs font-black text-slate-500">
                Fecha de fin
                <input type="date" value={reqForm.fecha_fin || ''} onChange={(event) => setReqForm((prev) => ({ ...prev, fecha_fin: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800" />
              </label>
              <label className="text-xs font-black text-slate-500 md:col-span-2">
                Reclutadores asignados
                <select
                  multiple
                  value={reqForm.reclutador_ids || []}
                  onChange={(event) => setReqForm((prev) => ({
                    ...prev,
                    reclutador_ids: Array.from(event.target.selectedOptions).map((option) => option.value),
                  }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 min-h-28"
                >
                  {recruiters.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Cantidad de posiciones requeridas
                <input type="number" min={1} step={1} value={reqForm.vacantes || 1} onChange={(event) => setReqForm((prev) => ({ ...prev, vacantes: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-black text-slate-500">
                Estado
                <select value={reqForm.estado || 'Activa'} onChange={(event) => setReqForm((prev) => ({ ...prev, estado: event.target.value as SelectionRequisition['estado'] }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800">
                  <option value="Activa">Activo</option>
                  <option value="Finalizada">Finalizado</option>
                </select>
              </label>
              <label className="text-xs font-black text-slate-500 md:col-span-2">
                Observaciones
                <textarea value={reqForm.observaciones || ''} onChange={(event) => setReqForm((prev) => ({ ...prev, observaciones: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} />
              </label>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowReqModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Cancelar</button>
              <button onClick={() => void saveRequisition()} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}
      {showApplicantModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingApplicant ? 'Editar postulante' : 'Registrar postulante'}</h3>
              <button onClick={() => setShowApplicantModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-3 gap-4">
              <label className="text-xs font-black text-slate-500">
                Reclutador
                <select value={applicantForm.reclutador_id || ''} onChange={(event) => {
                  const recruiter = recruiters.find((user) => user.id === event.target.value);
                  setApplicantForm((prev) => ({ ...prev, reclutador_id: recruiter?.id, reclutador_nombre: recruiter?.nombre }));
                }} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" disabled={currentUser.rol === 'Reclutador'}>
                  {recruiters.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Coordi/Super
                <select value={applicantForm.coordinador_excel || ''} onChange={(event) => setApplicantForm((prev) => ({ ...prev, coordinador_excel: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {managers.map((user) => <option key={user.id}>{user.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Cuenta
                <input disabled value={applicantForm.cuenta || selectedReq?.cuenta || ''} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-100" />
              </label>
              <label className="text-xs font-black text-slate-500">
                Fuente
                <select value={applicantForm.fuente || sourceOptions[0]} onChange={(event) => setApplicantForm((prev) => ({ ...prev, fuente: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {sourceOptions.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              {[
                ['posicion', 'Posición'],
                ['ciudad', 'Ciudad'],
                ['fecha_nacimiento', 'F. Nacimiento'],
                ['dni', 'DNI'],
                ['nombre_completo', 'Nombre y apellidos'],
                ['telefono', 'Teléfono'],
                ['correo', 'Correo electrónico'],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-black text-slate-500">
                  {label}
                  <input type={key === 'fecha_nacimiento' ? 'date' : 'text'} value={String((applicantForm as Record<string, unknown>)[key] || '')} onChange={(event) => setApplicantForm((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </label>
              ))}
              {[
                ['entrevista', 'Entrevista', ['Pendiente', 'Programada', 'Realizada', 'No asistió', 'Reprogramada']],
                ['examen_teorico', 'Examen teórico', ['Pendiente', 'Aprobado', 'Desaprobado', 'No aplica']],
                ['entrevista_rh', 'Entrevista RH', ['Pendiente', 'Aprobado', 'Desaprobado', 'No asistió', 'No aplica']],
                ['pruebas_psic', 'Pruebas psic.', ['Pendiente', 'Aprobado', 'Desaprobado', 'No asistió', 'No aplica']],
                ['entrevista_super_coord', 'Entrevista Super/Coord.', ['Pendiente', 'Aprobado', 'Desaprobado', 'No asistió', 'No aplica']],
              ].map(([key, label, options]) => (
                <label key={String(key)} className="text-xs font-black text-slate-500">
                  {String(label)}
                  <select value={String((applicantForm as Record<string, unknown>)[String(key)] || 'Pendiente')} onChange={(event) => setApplicantForm((prev) => ({ ...prev, [String(key)]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                    {(options as string[]).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
              ))}
              <label className="text-xs font-black text-slate-500">
                Status
                <select value={applicantForm.ultimo_estado || 'Pendiente de gestión'} onChange={(event) => setApplicantForm((prev) => ({ ...prev, ultimo_estado: event.target.value as SelectionApplicantStatus }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {applicantStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Motivo de no continuidad
                <select value={applicantForm.motivo_caida || ''} onChange={(event) => setApplicantForm((prev) => ({ ...prev, motivo_caida: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">No aplica</option>
                  {dropoutReasons.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              {applicantForm.motivo_caida === 'Otro' && (
                <label className="text-xs font-black text-slate-500 md:col-span-3">
                  Detalle del motivo
                  <input value={applicantForm.submotivo_caida || ''} onChange={(event) => setApplicantForm((prev) => ({ ...prev, submotivo_caida: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </label>
              )}
              <label className="text-xs font-black text-slate-500 md:col-span-3">
                Observaciones del postulante
                <textarea value={applicantForm.observaciones || ''} onChange={(event) => setApplicantForm((prev) => ({ ...prev, observaciones: event.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowApplicantModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Cancelar</button>
              <button onClick={() => void saveApplicant()} disabled={saving} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}
      {deleteApplicantTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6">
            <AlertTriangle className="w-10 h-10 text-rose-600 mb-3" />
            <h3 className="font-black text-slate-900 text-xl">Eliminar postulante</h3>
            <p className="text-sm text-slate-500 mt-2">
              Postulante: <strong>{deleteApplicantTarget.nombre_completo}</strong><br />
              DNI: <strong>{deleteApplicantTarget.dni}</strong>
            </p>
            <textarea value={deleteApplicantReason} onChange={(event) => setDeleteApplicantReason(event.target.value)} placeholder="Motivo obligatorio de eliminación..." className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { setDeleteApplicantTarget(null); setDeleteApplicantReason(''); }} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Cancelar</button>
              <button onClick={() => void removeApplicant()} disabled={saving || deleteApplicantReason.trim().length < 8} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-sm disabled:opacity-50">Confirmar eliminación</button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6">
            <AlertTriangle className="w-10 h-10 text-rose-600 mb-3" />
            <h3 className="font-black text-slate-900 text-xl">Confirmar eliminación lógica</h3>
            <p className="text-sm text-slate-500 mt-2">
              Convocatoria: <strong>{deleteTarget.nombre}</strong><br />
              Código: <strong>{deleteTarget.codigo}</strong><br />
              Postulantes vinculados: <strong>{applicants.filter((item) => item.requisition_id === deleteTarget.id).length}</strong>
            </p>
            <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} placeholder="Motivo obligatorio de eliminación..." className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={3} />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Cancelar</button>
              <button onClick={() => void removeRequisition()} disabled={saving || deleteReason.trim().length < 8} className="px-4 py-2 rounded-xl bg-rose-600 text-white font-black text-sm disabled:opacity-50">Confirmar eliminación</button>
            </div>
          </div>
        </div>
      )}

      {assignTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">Asignar aptos a capacitación</h3>
                <p className="text-xs text-slate-500">{assignTarget.codigo} · {selectedApplicants.length} postulantes seleccionados</p>
              </div>
              <button onClick={() => setAssignTarget(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-4">
              <label className="text-xs font-black text-slate-500">
                Formador
                <select value={assignForm.formador_id || ''} onChange={(event) => setAssignForm((prev) => ({ ...prev, formador_id: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Seleccionar</option>
                  {trainers.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                </select>
              </label>
              {[
                ['fecha_inicio', 'Fecha inicio', 'date'],
                ['fecha_fin', 'Fecha fin', 'date'],
                ['hora_capacitacion', 'Hora', 'time'],
                ['tipo_capacitacion', 'Tipo', 'text'],
                ['modalidad', 'Modalidad', 'text'],
              ].map(([key, label, type]) => (
                <label key={key} className="text-xs font-black text-slate-500">
                  {label}
                  <input type={type} value={assignForm[key] || ''} onChange={(event) => setAssignForm((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </label>
              ))}
            </div>
            <div className="p-5 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setAssignTarget(null)} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-sm">Cancelar</button>
              <button onClick={() => void assignTraining()} disabled={saving || selectedApplicants.length === 0} className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm disabled:opacity-50">
                Crear capacitación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
