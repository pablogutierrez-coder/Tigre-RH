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
  | 'historial'
  | 'catalogos'
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
  cuenta: '',
  posicion: '',
  ciudad: '',
  fuente_principal: 'Referido',
  vacantes: 1,
  meta_leads: 10,
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
  'Interesado',
  'No interesado',
  'No responde',
  'Entrevista inicial',
  'Examen teórico',
  'Entrevista RH',
  'Pruebas psicológicas',
  'Entrevista Supervisor/Coordinador',
  'Apto para capacitación',
  'Asignado a capacitación',
  'Alta en operación',
  'Caído',
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
  const [importPreview, setImportPreview] = useState<Partial<SelectionApplicant>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [assignTarget, setAssignTarget] = useState<SelectionRequisition | null>(null);
  const [assignForm, setAssignForm] = useState<Record<string, string>>({});

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
        req.posicion.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'Todos' || req.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requisitions, search, statusFilter]);

  const scopedApplicants = useMemo(() => {
    return applicants.filter((applicant) => {
      if (activeView === 'aptos') return applicant.ultimo_estado === 'Apto para capacitación';
      if (selectedReq?.id && activeView !== 'dashboard') return applicant.requisition_id === selectedReq.id;
      return true;
    });
  }, [activeView, applicants, selectedReq?.id]);

  const metrics = useMemo(() => {
    const total = applicants.length;
    const managed = applicants.filter((item) => item.fecha_primera_gestion).length;
    const interested = applicants.filter((item) => item.ultimo_estado === 'Interesado').length;
    const noInterested = applicants.filter((item) => item.ultimo_estado === 'No interesado').length;
    const noResponse = applicants.filter((item) => item.ultimo_estado === 'No responde').length;
    const apt = applicants.filter((item) => item.ultimo_estado === 'Apto para capacitación' || item.ultimo_estado === 'Asignado a capacitación' || item.ultimo_estado === 'Alta en operación').length;
    const assigned = applicants.filter((item) => item.training_session_id).length;
    const high = applicants.filter((item) => item.estado_alta_operacion === 'Alta en operación').length;
    const slaOk = applicants.filter((item) => item.cumple_sla).length;
    return { total, managed, interested, noInterested, noResponse, apt, assigned, high, slaOk };
  }, [applicants]);

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
        vacantes: Number(reqForm.vacantes || 0),
        meta_leads: Number(reqForm.meta_leads || 0),
        sla_objetivo: Number(reqForm.sla_objetivo || 60),
        max_intentos_contacto: Number(reqForm.max_intentos_contacto || 3),
        seguimiento_max_horas: Number(reqForm.seguimiento_max_horas || 24),
        reclutador_nombres: selectedRecruiters.map((user) => user.nombre),
      };
      if (!payload.nombre || !payload.cuenta || !payload.posicion || !payload.ciudad || !payload.fecha_inicio || !payload.fecha_fin) {
        alert('Completa nombre, cuenta, posición, ciudad y fechas.');
        return;
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
        reclutador_nombre: currentUser.rol === 'Reclutador' ? currentUser.nombre : recruiter?.nombre || applicantForm.reclutador_nombre,
      };
      if (!payload.dni || !payload.nombre_completo || !payload.telefono) {
        alert('DNI, nombre y teléfono son obligatorios.');
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
    const needsReason = ['No interesado', 'No apto', 'Caído'].includes(status);
    const reason = needsReason ? window.prompt('Indica el motivo del cambio de estado:') : '';
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
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-fuchsia-600 font-black uppercase tracking-widest">Selección</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Gestión Integral de Selección</h2>
          <p className="text-slate-500 text-sm">
            Convocatorias, postulantes, SLA, seguimiento, aptos y asignación a capacitación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManagerRole(currentUser.rol) && (
            <button
              onClick={openNewRequisition}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-black shadow-md"
            >
              <Plus className="w-4 h-4" />
              Crear convocatoria
            </button>
          )}
          <button
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold"
          >
            <History className="w-4 h-4" />
            Sincronizar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm font-semibold flex gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {renderKpi('Leads registrados', metrics.total, <Users className="w-5 h-5" />, 'indigo')}
        {renderKpi('Gestionados', metrics.managed, <UserCheck className="w-5 h-5" />, 'emerald')}
        {renderKpi('Aptos capacitación', metrics.apt, <CheckCircle2 className="w-5 h-5" />, 'fuchsia')}
        {renderKpi('Asignados', metrics.assigned, <Send className="w-5 h-5" />, 'blue')}
        {renderKpi('Cumplimiento SLA', `${percent(metrics.slaOk, metrics.total)}%`, <BarChart3 className="w-5 h-5" />, 'amber')}
      </div>

      {activeView === 'dashboard' && (
        <div className="grid xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-fuchsia-600" />
              Embudo de Selección
            </h3>
            {[
              ['Leads registrados', metrics.total],
              ['Leads gestionados', metrics.managed],
              ['Interesados', metrics.interested],
              ['Aptos para capacitación', metrics.apt],
              ['Asignados a capacitación', metrics.assigned],
              ['Altas en operación', metrics.high],
            ].map(([label, value], index) => (
              <div key={String(label)} className="mb-3">
                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500"
                    style={{ width: `${Math.max(5, percent(Number(value), metrics.total || Number(value) || 1) - index * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <h3 className="font-black text-slate-900 mb-4">Ranking por reclutador</h3>
            {recruiters.map((recruiter) => {
              const mine = applicants.filter((item) => item.reclutador_id === recruiter.id);
              const apt = mine.filter((item) => item.ultimo_estado === 'Apto para capacitación' || item.training_session_id).length;
              return (
                <div key={recruiter.id} className="flex items-center justify-between border-b border-slate-100 py-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{recruiter.nombre}</p>
                    <p className="text-[11px] text-slate-400">{mine.length} leads</p>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                    {percent(apt, mine.length)}%
                  </span>
                </div>
              );
            })}
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

      {activeView === 'convocatorias' && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleReqs.map((req) => {
            const reqApplicants = applicants.filter((item) => item.requisition_id === req.id);
            const apt = reqApplicants.filter((item) => item.ultimo_estado === 'Apto para capacitación' || item.training_session_id).length;
            const highs = reqApplicants.filter((item) => item.estado_alta_operacion === 'Alta en operación').length;
            const daysLeft = getDaysLeft(req.fecha_fin);
            return (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className={`h-1 ${daysLeft < 0 ? 'bg-rose-500' : daysLeft <= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{req.codigo}</span>
                      <h3 className="text-lg font-black text-slate-900 mt-3">{req.nombre}</h3>
                      <p className="text-sm text-slate-500">{req.cuenta} · {req.posicion} · {req.ciudad}</p>
                    </div>
                    <div className="flex gap-1">
                      {isManagerRole(currentUser.rol) && (
                        <button onClick={() => openEditRequisition(req)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      {currentUser.rol === 'Administrador' && (
                        <button onClick={() => setDeleteTarget(req)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] text-slate-400 font-black uppercase">Leads</p>
                      <p className="text-xl font-black text-slate-900">{reqApplicants.length}</p>
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

      {['postulantes', 'seguimientos', 'evaluaciones', 'aptos', 'historial'].includes(activeView) && selectedReq && (
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
                          <button onClick={() => openEditApplicant(applicant)} className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setSelectedApplicants((prev) => prev.includes(applicant.id) ? prev.filter((id) => id !== applicant.id) : [...prev, applicant.id])} className="p-2 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
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

      {['catalogos'].includes(activeView) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="font-black text-slate-900">Catálogos de Selección</h3>
          <p className="text-sm text-slate-500 mt-1">Estados, fuentes, motivos de caída y etapas se operan con catálogos base del módulo. La edición avanzada queda preparada para una siguiente iteración.</p>
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {['Pendiente de gestión', 'Interesado', 'No interesado', 'No responde', 'Apto para capacitación'].map((item) => (
              <div key={item} className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-700">{item}</div>
            ))}
          </div>
        </div>
      )}

      {showReqModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white rounded-t-3xl">
              <div>
                <h3 className="text-xl font-black">{editingReq ? 'Editar convocatoria' : 'Crear convocatoria'}</h3>
                <p className="text-xs text-white/80">Configura responsables, fechas, SLA y datos de capacitación.</p>
              </div>
              <button onClick={() => setShowReqModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-4">
              {[
                ['nombre', 'Nombre de convocatoria'],
                ['cuenta', 'Cuenta o campaña'],
                ['posicion', 'Posición'],
                ['ciudad', 'Ciudad'],
                ['fuente_principal', 'Fuente principal'],
                ['fecha_inicio', 'Fecha inicio'],
                ['fecha_fin', 'Fecha fin'],
                ['training_fecha_inicio', 'Inicio capacitación'],
                ['training_fecha_fin', 'Fin capacitación'],
                ['training_hora', 'Hora capacitación'],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-black text-slate-500">
                  {label}
                  <input
                    type={key.includes('fecha') ? 'date' : key.includes('hora') ? 'time' : 'text'}
                    value={String((reqForm as Record<string, unknown>)[key] || '')}
                    onChange={(event) => setReqForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  />
                </label>
              ))}
              <label className="text-xs font-black text-slate-500">
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
                Formador sugerido
                <select
                  value={reqForm.training_formador_id || ''}
                  onChange={(event) => {
                    const trainer = trainers.find((user) => user.id === event.target.value);
                    setReqForm((prev) => ({ ...prev, training_formador_id: trainer?.id, training_formador_nombre: trainer?.nombre }));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                >
                  <option value="">Pendiente</option>
                  {trainers.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500">
                Meta leads
                <input type="number" value={reqForm.meta_leads || 0} onChange={(event) => setReqForm((prev) => ({ ...prev, meta_leads: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="text-xs font-black text-slate-500">
                Vacantes
                <input type="number" value={reqForm.vacantes || 0} onChange={(event) => setReqForm((prev) => ({ ...prev, vacantes: Number(event.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
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
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-900">{editingApplicant ? 'Editar postulante' : 'Registrar postulante'}</h3>
              <button onClick={() => setShowApplicantModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-4">
              {[
                ['dni', 'DNI'],
                ['nombre_completo', 'Nombre y apellidos'],
                ['telefono', 'Teléfono'],
                ['correo', 'Correo'],
                ['fuente', 'Fuente'],
                ['ciudad', 'Ciudad'],
              ].map(([key, label]) => (
                <label key={key} className="text-xs font-black text-slate-500">
                  {label}
                  <input value={String((applicantForm as Record<string, unknown>)[key] || '')} onChange={(event) => setApplicantForm((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                </label>
              ))}
              <label className="text-xs font-black text-slate-500">
                Estado
                <select value={applicantForm.ultimo_estado || 'Pendiente de gestión'} onChange={(event) => setApplicantForm((prev) => ({ ...prev, ultimo_estado: event.target.value as SelectionApplicantStatus }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
                  {applicantStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-xs font-black text-slate-500 md:col-span-2">
                Observaciones
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
