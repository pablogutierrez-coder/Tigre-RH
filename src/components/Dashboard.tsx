/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Clock,
  Briefcase,
  Layers,
  Calendar,
  Filter,
  RefreshCw,
  Award
} from 'lucide-react';
import { TrainingSession, Participant, AttendanceRecord, OperationConfirmation, AttendanceReopenRequest } from '../types';

interface DashboardProps {
  sessions: TrainingSession[];
  participants: Participant[];
  attendance: AttendanceRecord[];
  confirmations: OperationConfirmation[];
  reopens: AttendanceReopenRequest[];
  trainers: { id: string; nombre: string }[];
  recruiters: { id: string; nombre: string }[];
}

export default function Dashboard({
  sessions,
  participants,
  attendance,
  confirmations,
  reopens,
  trainers,
  recruiters
}: DashboardProps) {
  // Filters state
  const [filterCampaña, setFilterCampaña] = useState<string>('todos');
  const [filterFormador, setFilterFormador] = useState<string>('todos');
  const [filterReclutador, setFilterReclutador] = useState<string>('todos');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterRango, setFilterRango] = useState<string>('todos'); // 'todos', 'junio', 'julio'

  // Reset Filters
  const handleResetFilters = () => {
    setFilterCampaña('todos');
    setFilterFormador('todos');
    setFilterReclutador('todos');
    setFilterTipo('todos');
    setFilterRango('todos');
  };

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (filterCampaña !== 'todos' && s.campaña !== filterCampaña) return false;
      if (filterFormador !== 'todos' && s.formador_id !== filterFormador) return false;
      if (filterReclutador !== 'todos' && s.reclutador_id !== filterReclutador) return false;
      if (filterTipo !== 'todos' && s.tipo_capacitacion !== filterTipo) return false;
      if (filterRango === 'junio' && !s.fecha_inicio.includes('-06-')) return false;
      if (filterRango === 'julio' && !s.fecha_inicio.includes('-07-')) return false;
      return true;
    });
  }, [sessions, filterCampaña, filterFormador, filterReclutador, filterTipo, filterRango]);

  const filteredSessionIds = useMemo(() => new Set(filteredSessions.map(s => s.id)), [filteredSessions]);

  // Filtered Participants
  const filteredParticipants = useMemo(() => {
    return participants.filter(p => filteredSessionIds.has(p.training_session_id));
  }, [participants, filteredSessionIds]);

  const filteredParticipantIds = useMemo(() => new Set(filteredParticipants.map(p => p.id)), [filteredParticipants]);

  // Filtered Attendance & Confirmations
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => filteredParticipantIds.has(a.participant_id));
  }, [attendance, filteredParticipantIds]);

  // Helper to filter out deleted altas
  const validConfirmations = useMemo(() => {
    return confirmations.filter(high => !high.isDeleted && high.estado_alta !== 'Eliminada');
  }, [confirmations]);

  const filteredConfirmations = useMemo(() => {
    return validConfirmations.filter(c => filteredParticipantIds.has(c.participant_id));
  }, [validConfirmations, filteredParticipantIds]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const totalCargados = filteredParticipants.length;

    // Days attendance counts
    const d1Attendants = new Set();
    const d5Attendants = new Set();

    filteredAttendance.forEach(a => {
      if (a.estado_asistencia === 'Asistió' || a.estado_asistencia === 'Tardanza') {
        if (a.dia === 1) d1Attendants.add(a.participant_id);
        if (a.dia === 5) d5Attendants.add(a.participant_id);
      }
    });

    const asistieronDia1 = d1Attendants.size;
    const asistieronDia5 = d5Attendants.size;

    // Completaron capacitación (participants with final status Completó, Alta confirmada, or Pendiente de alta)
    const completaron = filteredParticipants.filter(p =>
      p.estado_final === 'Completó capacitación' ||
      p.estado_final === 'Pendiente de alta' ||
      p.estado_final === 'Alta confirmada'
    ).length;

    // Desistidos
    const desistidos = filteredParticipants.filter(p => p.estado_final === 'Desistió').length;

    // Altas confirmadas
    const altasConfirmadas = filteredConfirmations.filter(c => c.estado_alta === 'Alta confirmada').length;
    const pendientesAlta = filteredParticipants.filter(p => p.estado_final === 'Pendiente de alta').length;

    // Aptos / No aptos counts
    const aptos = filteredParticipants.filter(p => p.resultado_formacion === 'Apto').length;
    const noAptos = filteredParticipants.filter(p => p.resultado_formacion === 'No apto').length;
    const totalConResultado = aptos + noAptos;
    const porcAptos = totalConResultado > 0 ? Math.round((aptos / totalConResultado) * 100) : 0;

    // Rates
    const retencionDia1a5 = asistieronDia1 > 0 ? Math.round((asistieronDia5 / asistieronDia1) * 100) : 0;
    const conversionAlta = totalCargados > 0 ? Math.round((altasConfirmadas / totalCargados) * 100) : 0;
    const desercionRate = totalCargados > 0 ? Math.round((desistidos / totalCargados) * 100) : 0;

    // Requests
    const reqPendientes = reopens.filter(r => r.estado === 'pendiente').length;
    const reqAprobadas = reopens.filter(r => r.estado === 'aprobada').length;
    const reqRechazadas = reopens.filter(r => r.estado === 'rechazada').length;

    return {
      totalCargados,
      asistieronDia1,
      asistieronDia5,
      completaron,
      desistidos,
      altasConfirmadas,
      pendientesAlta,
      aptos,
      noAptos,
      totalConResultado,
      porcAptos,
      retencionDia1a5,
      conversionAlta,
      desercionRate,
      reqPendientes,
      reqAprobadas,
      reqRechazadas
    };
  }, [filteredParticipants, filteredAttendance, filteredConfirmations, reopens]);

  // 1. Embudo (Funnel) Data
  const funnelData = useMemo(() => {
    const total = metrics.totalCargados;

    // Calculate attendants per day
    const dayCounts = [0, 0, 0, 0, 0]; // Day 1, 2, 3, 4, 5
    filteredAttendance.forEach(a => {
      if (a.estado_asistencia === 'Asistió' || a.estado_asistencia === 'Tardanza') {
        if (a.dia >= 1 && a.dia <= 5) {
          dayCounts[a.dia - 1]++;
        }
      }
    });

    return [
      { name: 'Cargados', valor: total, fill: '#6366f1' }, // Indigo
      { name: 'Asist. Día 1', valor: dayCounts[0], fill: '#3b82f6' }, // Blue
      { name: 'Asist. Día 2', valor: dayCounts[1], fill: '#06b6d4' }, // Cyan
      { name: 'Asist. Día 3', valor: dayCounts[2], fill: '#14b8a6' }, // Teal
      { name: 'Asist. Día 4', valor: dayCounts[3], fill: '#10b981' }, // Emerald
      { name: 'Asist. Día 5', valor: dayCounts[4], fill: '#84cc16' }, // Lime
      { name: 'Altas Conf.', valor: metrics.altasConfirmadas, fill: '#ec4899' } // Pink / Fuchsia
    ];
  }, [metrics, filteredAttendance]);

  // 2. Comparativo por Campaña
  const campañaData = useMemo(() => {
    const campaigns = ['Entel Empresas', 'Prosegur', 'Culqi'];
    return campaigns.map(camp => {
      const campSessions = filteredSessions.filter(s => s.campaña === camp);
      const campSessionIds = new Set(campSessions.map(s => s.id));
      const campParts = participants.filter(p => campSessionIds.has(p.training_session_id));
      const campPartIds = new Set(campParts.map(p => p.id));

      const total = campParts.length;
      const desistidos = campParts.filter(p => p.estado_final === 'Desistió').length;
      const d1 = new Set();
      const d5 = new Set();

      attendance.forEach(a => {
        if (campPartIds.has(a.participant_id) && (a.estado_asistencia === 'Asistió' || a.estado_asistencia === 'Tardanza')) {
          if (a.dia === 1) d1.add(a.participant_id);
          if (a.dia === 5) d5.add(a.participant_id);
        }
      });

      const altas = validConfirmations.filter(c => campPartIds.has(c.participant_id) && c.estado_alta === 'Alta confirmada').length;
      const retencion = d1.size > 0 ? Math.round((d5.size / d1.size) * 100) : 0;
      const conversion = total > 0 ? Math.round((altas / total) * 100) : 0;

      return {
        name: camp,
        Cargados: total,
        'Asist. Día 1': d1.size,
        'Asist. Día 5': d5.size,
        Desistidos: desistidos,
        Altas: altas,
        'Retención %': retencion,
        'Conversión %': conversion
      };
    });
  }, [filteredSessions, participants, attendance, validConfirmations]);

  // 3. Comparativo por Formador
  const formadorData = useMemo(() => {
    return trainers.map(t => {
      const trainerSessions = filteredSessions.filter(s => s.formador_id === t.id);
      const sIds = new Set(trainerSessions.map(s => s.id));
      const tParts = participants.filter(p => sIds.has(p.training_session_id));
      const tPartIds = new Set(tParts.map(p => p.id));

      const total = tParts.length;
      const desistidos = tParts.filter(p => p.estado_final === 'Desistió').length;
      const d5 = new Set();

      attendance.forEach(a => {
        if (tPartIds.has(a.participant_id) && (a.estado_asistencia === 'Asistió' || a.estado_asistencia === 'Tardanza')) {
          if (a.dia === 5) d5.add(a.participant_id);
        }
      });

      const altas = validConfirmations.filter(c => tPartIds.has(c.participant_id) && c.estado_alta === 'Alta confirmada').length;
      const efectividad = total > 0 ? Math.round((altas / total) * 100) : 0;

      return {
        name: t.nombre.split(' ')[0] + ' ' + (t.nombre.split(' ')[1] || ''), // Short name
        Asignados: total,
        Completados: d5.size,
        Deserciones: desistidos,
        Altas: altas,
        'Efectividad %': efectividad
      };
    });
  }, [filteredSessions, trainers, participants, attendance, validConfirmations]);

  // 4. Deserciones por Motivo
  const desercionesPorMotivo = useMemo(() => {
    const motivosCounts: { [key: string]: number } = {};

    // Check attendance for motivo_desercion
    filteredAttendance.forEach(a => {
      if (a.estado_asistencia === 'Desistió' && a.motivo_desercion) {
        motivosCounts[a.motivo_desercion] = (motivosCounts[a.motivo_desercion] || 0) + 1;
      }
    });

    const colors = ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#f59e0b', '#ef4444'];

    return Object.keys(motivosCounts).map((motivo, index) => ({
      name: motivo,
      value: motivosCounts[motivo],
      color: colors[index % colors.length]
    })).sort((a, b) => b.value - a.value);
  }, [filteredAttendance]);

  // 5. Evolución Mensual / Semanal (Trend)
  const evolutionData = [
    { name: 'Semana 1', Cargados: 5, Dia1: 5, Dia5: 4, Altas: 3 },
    { name: 'Semana 2', Cargados: 8, Dia1: 8, Dia5: 6, Altas: 5 },
    { name: 'Semana 3', Cargados: 12, Dia1: 11, Dia5: 9, Altas: 8 },
    { name: 'Semana 4', Cargados: 15, Dia1: 14, Dia5: 11, Altas: 10 }
  ];

  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Filters Bar */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="text-fuchsia-600 w-5 h-5" />
            <h2 className="text-slate-800 font-semibold text-lg">Filtros Ejecutivos</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-3">
            {/* Campaña */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Campaña</label>
              <select
                value={filterCampaña}
                onChange={(e) => setFilterCampaña(e.target.value)}
                className="w-full text-xs glass-input text-slate-700 rounded-lg p-2 outline-hidden"
              >
                <option value="todos">Todas las Campañas</option>
                <option value="Entel Empresas">Entel Empresas</option>
                <option value="Prosegur">Prosegur</option>
                <option value="Culqi">Culqi</option>
              </select>
            </div>

            {/* Formador */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Formador</label>
              <select
                value={filterFormador}
                onChange={(e) => setFilterFormador(e.target.value)}
                className="w-full text-xs glass-input text-slate-700 rounded-lg p-2 outline-hidden"
              >
                <option value="todos">Todos los Formadores</option>
                {trainers.map(t => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            {/* Reclutador */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Reclutador</label>
              <select
                value={filterReclutador}
                onChange={(e) => setFilterReclutador(e.target.value)}
                className="w-full text-xs glass-input text-slate-700 rounded-lg p-2 outline-hidden"
              >
                <option value="todos">Todos los Reclutadores</option>
                {recruiters.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            {/* Tipo Capacitación */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Capacit.</label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full text-xs glass-input text-slate-700 rounded-lg p-2 outline-hidden"
              >
                <option value="todos">Todos los Tipos</option>
                <option value="Capacitación regular">Regular</option>
                <option value="Capacitación flash">Flash</option>
                <option value="Capacitación de producto">De Producto</option>
                <option value="Capacitación de ficha">De Ficha</option>
                <option value="Capacitación de equipo">De Equipo</option>
                <option value="Inyección de campaña">Inyección</option>
                <option value="RUC 20">RUC 20</option>
              </select>
            </div>

            {/* Rango / Mes */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Temporalidad</label>
              <select
                value={filterRango}
                onChange={(e) => setFilterRango(e.target.value)}
                className="w-full text-xs glass-input text-slate-700 rounded-lg p-2 outline-hidden"
              >
                <option value="todos">Histórico General</option>
                <option value="junio">Junio 2026</option>
                <option value="julio">Julio 2026</option>
              </select>
            </div>

            {/* Reset */}
            <div className="flex items-end">
              <button
                onClick={handleResetFilters}
                className="w-full sm:w-auto h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs px-3 py-2 flex items-center justify-center gap-1.5 transition-colors font-medium cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-grid">
        {/* Card 1 */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-wider">Cargados en FDR</p>
              <h3 className="text-slate-800 text-3xl font-bold mt-1">{metrics.totalCargados}</h3>
              <p className="text-xs text-indigo-500 font-medium mt-1">Participantes registrados</p>
            </div>
            <div className="bg-indigo-50/50 backdrop-blur-xs rounded-xl p-2.5 text-indigo-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-wider">Llegaron al Día 5</p>
              <h3 className="text-slate-800 text-3xl font-bold mt-1">{metrics.asistieronDia5}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {metrics.retencionDia1a5}% retención Día 1 a 5
              </p>
            </div>
            <div className="bg-cyan-50/50 backdrop-blur-xs rounded-xl p-2.5 text-cyan-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-fuchsia-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-wider">Alta Confirmada</p>
              <h3 className="text-slate-800 text-3xl font-bold mt-1">{metrics.altasConfirmadas}</h3>
              <p className="text-xs text-fuchsia-600 font-medium mt-1">
                {metrics.conversionAlta}% conversión final
              </p>
            </div>
            <div className="bg-fuchsia-50/50 backdrop-blur-xs rounded-xl p-2.5 text-fuchsia-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 font-medium text-xs uppercase tracking-wider">Deserciones</p>
              <h3 className="text-slate-800 text-3xl font-bold mt-1">{metrics.desistidos}</h3>
              <p className="text-xs text-rose-500 font-medium mt-1">
                {metrics.desercionRate}% deserción total
              </p>
            </div>
            <div className="bg-rose-50/50 backdrop-blur-xs rounded-xl p-2.5 text-rose-600">
              <UserX className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Reopen Requests Notifications */}
      {metrics.reqPendientes > 0 && (
        <div className="bg-amber-500/10 backdrop-blur-md border border-amber-500/20 rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/20 text-amber-800 p-2 rounded-lg">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-amber-900 font-bold text-sm">Solicitudes de Reapertura Pendientes</h4>
              <p className="text-amber-800 text-xs font-medium">Hay {metrics.reqPendientes} solicitudes de formadores esperando aprobación para editar asistencias.</p>
            </div>
          </div>
          <span className="bg-amber-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
            Pendientes: {metrics.reqPendientes}
          </span>
        </div>
      )}

      {/* Charts Panel Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Embudo de Formación */}
        <div className="glass-card flex flex-col p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
              <TrendingUp className="text-indigo-600 w-4.5 h-4.5" />
              Embudo de Formación
            </h3>
            <span className="text-slate-400 text-xs font-mono">Conversión</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={85} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-xs text-slate-500">
            Muestra el flujo de participantes desde la carga inicial hasta el alta en operación.
          </div>
        </div>

        {/* Comparativo por Campaña */}
        <div className="glass-card flex flex-col p-5 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
              <Briefcase className="text-fuchsia-600 w-4.5 h-4.5" />
              Comparativo por Campaña BPO
            </h3>
            <span className="text-slate-400 text-xs font-mono">Rendimiento</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={campañaData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Cargados" fill="#818cf8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Asist. Día 1" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Asist. Día 5" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Altas" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2 pt-3 border-t border-slate-100">
            {campañaData.map(c => (
              <div key={c.name} className="text-center">
                <p className="text-[10px] text-slate-500 font-semibold uppercase truncate">{c.name}</p>
                <p className="text-xs font-bold text-slate-700">Conv: {c['Conversión %']}%</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Panel Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comparativo por Formador */}
        <div className="glass-card flex flex-col p-5 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
              <UserCheck className="text-violet-600 w-4.5 h-4.5" />
              Comparativo por Formador FDR
            </h3>
            <span className="text-slate-400 text-xs font-mono">Efectividad</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formadorData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Asignados" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Completados" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Altas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-xs text-slate-500">
            Compara la efectividad de los formadores en llevar participantes al alta final.
          </div>
        </div>

        {/* Deserciones por Motivo */}
        <div className="glass-card flex flex-col p-5 rounded-2xl lg:col-span-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
              <UserX className="text-rose-500 w-4.5 h-4.5" />
              Deserciones por Motivo
            </h3>
            <span className="text-slate-400 text-xs font-mono">Distribución</span>
          </div>
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {desercionesPorMotivo.length === 0 ? (
              <div className="text-center text-slate-400 py-10">
                <p className="text-sm">No se registran deserciones en este período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={desercionesPorMotivo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {desercionesPorMotivo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {desercionesPorMotivo.length > 0 && (
            <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              {desercionesPorMotivo.slice(0, 4).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="truncate">{item.name}</span>
                  </div>
                  <span className="font-bold font-mono">{item.value} ({Math.round((item.value / metrics.desistidos) * 100)}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resultados de Formación (Aptitud) Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución de Aptitud Card */}
        <div className="glass-card flex flex-col p-5 rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
              <Award className="text-emerald-600 w-4.5 h-4.5" />
              Resultados de Calificación (Día 5)
            </h3>
            <span className="text-slate-400 text-xs font-mono">Aptitud</span>
          </div>
          
          <div className="flex-1 min-h-[220px] flex items-center justify-center">
            {metrics.totalConResultado === 0 ? (
              <div className="text-center text-slate-400 py-10">
                <p className="text-sm">No se registran calificaciones de aptitud todavía</p>
                <p className="text-[11px] text-slate-400 mt-1">Marque Apto/No apto en el Día 5 de asistencia</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Apto', value: metrics.aptos, color: '#10b981' },
                      { name: 'No apto', value: metrics.noAptos, color: '#f43f5e' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          
          {metrics.totalConResultado > 0 && (
            <div className="mt-2 space-y-2 pt-3 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full inline-block bg-emerald-500"></span>
                  <span>Ejecutivos Aptos</span>
                </div>
                <span className="font-bold font-mono text-emerald-600">{metrics.aptos} ({metrics.porcAptos}%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full inline-block bg-rose-500"></span>
                  <span>Ejecutivos No aptos</span>
                </div>
                <span className="font-bold font-mono text-rose-600">{metrics.noAptos} ({100 - metrics.porcAptos}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Novedades y Comentarios de Aptitud (Aptos / No aptos) */}
        <div className="glass-card flex flex-col p-5 rounded-2xl lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
              <Users className="text-indigo-600 w-4.5 h-4.5" />
              Detalle de Novedades de Calificación
            </h3>
            <span className="text-slate-400 text-xs font-mono">Comentarios</span>
          </div>
          
          <div className="flex-1 max-h-[280px] overflow-y-auto space-y-3 pr-1">
            {(() => {
              const ratedParts = filteredParticipants.filter(p => p.resultado_formacion === 'Apto' || p.resultado_formacion === 'No apto');
              if (ratedParts.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center text-slate-400 h-full py-16">
                    <p className="text-sm">Sin comentarios de aptitud recientes</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Las justificaciones de Aptitud/No aptitud se verán aquí</p>
                  </div>
                );
              }
              return ratedParts.map(p => {
                const isApto = p.resultado_formacion === 'Apto';
                return (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">{p.nombres} {p.apellidos}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">DNI: {p.dni}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isApto ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.resultado_formacion}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed italic">
                      "{isApto ? p.comentario_aptitud : p.motivo_no_apt}"
                    </p>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Trend Analysis Graph */}
      <div className="glass-card flex flex-col p-5 rounded-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-slate-800 font-bold text-base flex items-center gap-1.5">
            <Layers className="text-blue-600 w-4.5 h-4.5" />
            Evolución de Capacitación FDR (Semanal)
          </h3>
          <span className="text-slate-400 text-xs font-mono">Tendencias</span>
        </div>
        <div className="min-h-[220px]">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={evolutionData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCargados" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAltas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Cargados" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCargados)" />
              <Area type="monotone" dataKey="Altas" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorAltas)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
