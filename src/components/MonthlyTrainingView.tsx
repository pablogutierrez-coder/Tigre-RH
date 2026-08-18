import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, CheckCircle2, Clock3, Layers3, TrendingDown } from 'lucide-react';
import type { AttendanceRecord, OperationConfirmation, Participant, TrainingSession } from '../types';
import { getTrainingDaysCount } from '../utils/trainingDays';
import {
  formatTrainingDate,
  getTrainingCurrentDay,
  getTrainingTemporalStatus,
  type TrainingTemporalStatus,
} from '../utils/trainingMonthly';

interface MonthlyTrainingViewProps {
  month: string;
  sessions: TrainingSession[];
  participants: Participant[];
  attendance: AttendanceRecord[];
  confirmations: OperationConfirmation[];
  onViewDetail?: (sessionId: string) => void;
}

const normalizeStatus = (status?: string) =>
  (status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const isPresent = (status?: string) => ['asistio', 'tardanza'].includes(normalizeStatus(status));
const isRegistered = (status?: string) => !['', 'pendiente', 'seleccionar'].includes(normalizeStatus(status));

const statusPresentation: Record<TrainingTemporalStatus, { label: string; badge: string }> = {
  proxima: { label: 'PRÓXIMA', badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  en_curso: { label: 'EN CURSO', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  finalizada: { label: 'FINALIZADA', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const getSessionMetrics = (
  session: TrainingSession,
  participants: Participant[],
  attendance: AttendanceRecord[],
  confirmations: OperationConfirmation[],
) => {
  const sessionParticipants = participants.filter((participant) => participant.training_session_id === session.id);
  const participantIds = new Set(sessionParticipants.map((participant) => participant.id));
  const sessionAttendance = attendance.filter((record) =>
    record.training_session_id === session.id && participantIds.has(record.participant_id),
  );
  const recordsByDay = new Map<number, AttendanceRecord[]>();
  sessionAttendance.forEach((record) => {
    const records = recordsByDay.get(record.dia) || [];
    records.push(record);
    recordsByDay.set(record.dia, records);
  });

  const totalDays = getTrainingDaysCount(session);
  const status = getTrainingTemporalStatus(session);
  const currentDay = getTrainingCurrentDay(session);
  const lastExecutableDay = status === 'proxima' ? 0 : currentDay;
  const registeredDays = Array.from(recordsByDay.entries())
    .filter(([day, records]) => {
      if (day > lastExecutableDay) return false;
      const registered = records.filter((record) => isRegistered(record.estado_asistencia));
      return registered.length > 0 && !registered.every((record) => normalizeStatus(record.estado_asistencia) === 'feriado');
    })
    .map(([day]) => day)
    .sort((a, b) => a - b);
  const latestRegisteredDay = registeredDays.at(-1) || 0;
  const countPresent = (day: number) => new Set(
    (recordsByDay.get(day) || [])
      .filter((record) => isPresent(record.estado_asistencia))
      .map((record) => record.participant_id),
  ).size;

  const dayOneAttendance = registeredDays.includes(1) ? countPresent(1) : 0;
  const dayTwoAttendance = registeredDays.includes(2) ? countPresent(2) : 0;
  const latestAttendance = latestRegisteredDay ? countPresent(latestRegisteredDay) : 0;
  const finalAttendance = status === 'finalizada' && registeredDays.includes(totalDays)
    ? countPresent(totalDays)
    : null;
  const attendanceForRetention = latestRegisteredDay >= 2 ? latestAttendance : 0;
  const retained = dayTwoAttendance > 0 ? Math.min(dayTwoAttendance, attendanceForRetention) : 0;
  const retention = dayTwoAttendance > 0 ? Math.round((retained / dayTwoAttendance) * 100) : null;
  const desertion = retention === null ? null : 100 - retention;
  const confirmedHighs = status === 'finalizada'
    ? confirmations.filter((confirmation) =>
        !confirmation.isDeleted &&
        confirmation.estado_alta === 'Alta confirmada' &&
        participantIds.has(confirmation.participant_id),
      ).length
    : null;
  const highConversion = finalAttendance !== null && finalAttendance > 0 && confirmedHighs !== null
    ? Math.min(100, Math.round((confirmedHighs / finalAttendance) * 100))
    : null;

  return {
    session,
    status,
    totalDays,
    currentDay,
    progress: status === 'proxima' ? 0 : Math.round((currentDay / totalDays) * 100),
    loaded: sessionParticipants.length,
    dayOneAttendance,
    dayTwoAttendance,
    latestRegisteredDay,
    latestAttendance,
    retention,
    desertion,
    finalAttendance,
    confirmedHighs,
    highConversion,
  };
};

type SessionMetric = ReturnType<typeof getSessionMetrics>;

function MonthlyComparisonTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: SessionMetric & Record<string, unknown> }> }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-bold text-slate-900">{item.session.generation_code || item.session.nombre_generacion}</p>
      <div className="mt-2 space-y-1 text-slate-600">
        <p>Cargados: <strong>{item.loaded}</strong></p>
        <p>Día 2: <strong>{item.dayTwoAttendance}</strong></p>
        <p>Asistencia actual: <strong>{item.latestRegisteredDay ? item.latestAttendance : 'Pendiente'}</strong></p>
        <p>Deserción acumulada: <strong>{item.desertion === null ? 'Pendiente' : `${item.desertion}%`}</strong></p>
        <p>Estado: <strong>{statusPresentation[item.status].label}</strong></p>
        <p>Día actual: <strong>{item.currentDay || 0} de {item.totalDays}</strong></p>
      </div>
    </div>
  );
}

export default function MonthlyTrainingView({
  month,
  sessions,
  participants,
  attendance,
  confirmations,
  onViewDetail,
}: MonthlyTrainingViewProps) {
  const sessionMetrics = useMemo(
    () => sessions.map((session) => getSessionMetrics(session, participants, attendance, confirmations)),
    [sessions, participants, attendance, confirmations],
  );
  const counts = useMemo(() => ({
    total: sessionMetrics.length,
    enCurso: sessionMetrics.filter((item) => item.status === 'en_curso').length,
    finalizadas: sessionMetrics.filter((item) => item.status === 'finalizada').length,
  }), [sessionMetrics]);
  const globalDesertion = useMemo(() => {
    const trainingsWithAttendance = sessionMetrics.filter((item) => item.latestRegisteredDay >= 2 && item.dayTwoAttendance > 0);
    const dayTwoTotal = trainingsWithAttendance.reduce((total, item) => total + item.dayTwoAttendance, 0);
    const currentTotal = trainingsWithAttendance.reduce(
      (total, item) => total + Math.min(item.dayTwoAttendance, item.latestAttendance),
      0,
    );
    return {
      dayTwoTotal,
      currentTotal,
      percentage: dayTwoTotal > 0 ? Math.round(((dayTwoTotal - currentTotal) / dayTwoTotal) * 100) : 0,
    };
  }, [sessionMetrics]);
  const [year, monthNumber] = month.split('-').map(Number);
  const monthLabel = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));

  const kpis = [
    { label: 'Capacitaciones del mes', value: counts.total, icon: Layers3 },
    { label: 'En curso', value: counts.enCurso, icon: Clock3 },
    { label: 'Finalizadas', value: counts.finalizadas, icon: CheckCircle2 },
    {
      label: 'Deserción global',
      value: `${globalDesertion.percentage}%`,
      detail: `${globalDesertion.currentTotal} de ${globalDesertion.dayTwoTotal} continúan desde Día 2`,
      icon: TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
                {detail && <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>}
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-indigo-600">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Capacitaciones de {monthLabel}</h2>
          <p className="mt-1 text-sm text-slate-500">Avance y permanencia por capacitación durante el período seleccionado.</p>
        </div>

        {sessionMetrics.length === 0 ? (
          <div className="glass-card rounded-2xl px-6 py-12 text-center text-sm text-slate-500">
            No se encontraron capacitaciones para los filtros seleccionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {sessionMetrics.map((item) => {
              const presentation = statusPresentation[item.status];
              const session = item.session;
              return (
                <article key={session.id} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-black text-slate-900">{session.generation_code || session.nombre_generacion}</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{session.campaña}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-600">Generación: {session.nombre_generacion}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatTrainingDate(session.fecha_inicio)} - {formatTrainingDate(session.fecha_fin)} · {session.formador_nombre || 'Sin formador'}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Convocatoria: {String((session as TrainingSession & { requisition_codigo?: string; convocatoria_origen?: string }).requisition_codigo || (session as TrainingSession & { convocatoria_origen?: string }).convocatoria_origen || 'No vinculada')}
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${presentation.badge}`}>{presentation.label}</span>
                      <p className="mt-2 text-xs font-bold text-slate-600">
                        {item.status === 'proxima' ? `Inicia el ${formatTrainingDate(session.fecha_inicio)}` : `Día ${item.currentDay} de ${item.totalDays}`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-slate-100 pt-4">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Cargados</p>
                      <p className="mt-1 text-xl font-black text-slate-900">{item.loaded}</p>
                    </div>
                    <div className="rounded-xl bg-indigo-50/70 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Día 2</p>
                      <p className="mt-1 text-xl font-black text-indigo-700">{item.latestRegisteredDay >= 2 ? item.dayTwoAttendance : '-'}</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50/70 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Continúan</p>
                      <p className="mt-1 text-xl font-black text-emerald-700">{item.latestRegisteredDay ? item.latestAttendance : '-'}</p>
                      {item.latestRegisteredDay > 0 && <p className="text-[10px] font-semibold text-emerald-700/70">Día {item.latestRegisteredDay}</p>}
                    </div>
                    <div className="rounded-xl bg-rose-50/70 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Deserción</p>
                      <p className="mt-1 text-xl font-black text-rose-600">{item.desertion === null ? '-' : `${item.desertion}%`}</p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 rounded-xl border border-slate-100 px-3 py-2.5 text-xs">
                    <div><span className="text-slate-400">Retención</span><p className="font-black text-emerald-700">{item.retention === null ? 'Pendiente' : `${item.retention}%`}</p></div>
                    <div><span className="text-slate-400">Día final</span><p className="font-black text-slate-800">{item.finalAttendance === null ? 'Pendiente' : item.finalAttendance}</p></div>
                    <div><span className="text-slate-400">Altas</span><p className="font-black text-slate-800">{item.confirmedHighs === null ? 'Pendiente' : item.confirmedHighs}</p></div>
                    <div><span className="text-slate-400">Conversión</span><p className="font-black text-indigo-700">{item.highConversion === null ? 'Pendiente' : `${item.highConversion}%`}</p></div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">Avance del programa</span>
                      <span className="font-black text-slate-800">{item.progress}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${item.progress}%` }} />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onViewDetail?.(session.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Ver detalle
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {sessionMetrics.length > 0 && (
        <section className="glass-card rounded-2xl p-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">Comparativo por Capacitación</h3>
            <p className="mt-1 text-xs text-slate-500">Cargados, inicio, última asistencia registrada y altas de capacitaciones finalizadas.</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sessionMetrics} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey={(item: SessionMetric) => item.session.generation_code || item.session.nombre_generacion} stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip content={<MonthlyComparisonTooltip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="loaded" name="Cargados" fill="#64748b" radius={[3, 3, 0, 0]} />
              <Bar dataKey="dayTwoAttendance" name="Día 2" fill="#4f46e5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="latestAttendance" name="Última asistencia" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="confirmedHighs" name="Altas confirmadas" fill="#ec4899" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  );
}
