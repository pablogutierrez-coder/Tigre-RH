/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  User,
  Shield,
  Clock,
  ArrowRight
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditoriaProps {
  logs: AuditLog[];
}

export default function Auditoria({ logs }: AuditoriaProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModulo, setFilterModulo] = useState('todos');

  const parsePeruDateToTime = (fechaStr: string) => {
    // Expected format: DD/MM/YYYY HH:mm
    if (!fechaStr) return 0;
    const parts = fechaStr.split(' ');
    if (parts.length < 2) return new Date(fechaStr).getTime() || 0;
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    if (dateParts.length < 3 || timeParts.length < 2) return new Date(fechaStr).getTime() || 0;
    const day = Number(dateParts[0]);
    const month = Number(dateParts[1]) - 1;
    const year = Number(dateParts[2]);
    const hours = Number(timeParts[0]);
    const minutes = Number(timeParts[1]);
    return new Date(year, month, day, hours, minutes).getTime();
  };

  // visible logs sorted chronologically desc
  const sortedLogs = [...logs].sort((a, b) => parsePeruDateToTime(b.fecha) - parsePeruDateToTime(a.fecha));

  const filteredLogs = sortedLogs.filter(log => {
    const matchesSearch = log.usuario_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.accion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detalle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.generacion && log.generacion.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesModulo = filterModulo === 'todos' || log.modulo === filterModulo;

    return matchesSearch && matchesModulo;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-slate-800 text-2xl font-bold flex items-center gap-2">
          <FileText className="text-fuchsia-600" />
          Auditoría General del Sistema
        </h2>
        <p className="text-slate-500 text-sm">
          Monitorea y valida las acciones realizadas por reclutadores y formadores dentro o fuera del horario reglamentario.
        </p>
      </div>

      {/* Filters bar */}
      <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar por usuario, acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs glass-input text-slate-700 rounded-xl pl-8 pr-4 py-2.5 outline-hidden"
            />
          </div>

          <div>
            <select
              value={filterModulo}
              onChange={(e) => setFilterModulo(e.target.value)}
              className="w-full text-xs glass-input text-slate-700 rounded-xl px-3 py-2.5 outline-hidden"
            >
              <option value="todos">Todos los Módulos</option>
              <option value="Registro de capacitaciones">Registro de capacitaciones</option>
              <option value="Carga de participantes">Carga de participantes</option>
              <option value="Control de asistencia">Control de asistencia</option>
              <option value="Confirmación de altas">Confirmación de altas</option>
              <option value="Reaperturas de asistencia">Reaperturas de asistencia</option>
              <option value="Gestión de usuarios">Gestión de usuarios</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono font-semibold">
          Total logs: {filteredLogs.length}
        </div>
      </div>

      {/* Table listings */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic">
            No se registran eventos de auditoría con los filtros indicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Fecha y Hora</th>
                  <th className="p-4">Usuario</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Acción Realizada</th>
                  <th className="p-4">Módulo</th>
                  <th className="p-4">Detalles del Suceso</th>
                  <th className="p-4">Valores (Anterior → Nuevo)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40">
                    {/* Timestamp */}
                    <td className="p-4 font-mono text-slate-500">
                      {new Date(log.fecha).toLocaleString('es-PE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>

                    {/* User */}
                    <td className="p-4">
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {log.usuario_nombre}
                      </span>
                    </td>

                    {/* Rol */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        log.rol === 'Administrador' ? 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-100' :
                        log.rol === 'Reclutador' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {log.rol}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="p-4 font-bold text-slate-800">
                      {log.accion}
                    </td>

                    {/* Module */}
                    <td className="p-4 text-slate-500">
                      {log.modulo}
                    </td>

                    {/* Details */}
                    <td className="p-4 max-w-sm leading-relaxed text-slate-600">
                      <div>
                        {log.detalle}
                        {log.generacion && (
                          <span className="block text-[10px] text-indigo-600 font-semibold mt-0.5">
                            Generación: {log.generacion}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Values change */}
                    <td className="p-4 font-mono text-[10px]">
                      {log.valor_anterior || log.valor_nuevo ? (
                        <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 max-w-[180px] truncate">
                          <span className="text-rose-600 truncate" title={log.valor_anterior}>{log.valor_anterior || 'Ø'}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-emerald-600 truncate" title={log.valor_nuevo}>{log.valor_nuevo || 'Ø'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">No aplica</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
