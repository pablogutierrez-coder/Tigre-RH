import { Router, type Response } from 'express';
import { z } from 'zod';
import { adminDb } from '../firebaseAdmin.js';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
type AnyDoc = Record<string, any> & { id: string };

const COLLECTIONS = {
  requisitions: 'selection_requisitions',
  applicants: 'selection_applicants',
  audit: 'selection_audit',
  codeCounters: 'selection_requisition_code_counters',
  codeLocks: 'selection_requisition_codes',
  sessions: 'sessions',
  surveys: 'surveys',
  participants: 'participants',
  attendance: 'attendance',
};

const managerRoles = ['Administrador', 'Analista', 'Coordinador'];
const viewAllRoles = ['Administrador', 'Analista', 'Coordinador', 'Sistemas'];
const entitySchema = z.object({ id: z.string().min(1) }).passthrough();

const nowIso = () => new Date().toISOString();
const dateKey = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date()).replaceAll('-', '');

const normalize = (value: unknown) => String(value || '').trim();

const writeAudit = async (
  req: AuthenticatedRequest,
  action: string,
  entityId?: string,
  entityName?: string,
  reason?: string,
) => {
  const id = `sel-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await adminDb.collection(COLLECTIONS.audit).doc(id).set({
    id,
    action,
    module: 'Selección',
    entity_id: entityId,
    entity_name: entityName,
    user_id: req.user!.uid,
    user_name: req.user!.nombre,
    user_role: req.user!.rol,
    reason,
    ip: req.ip,
    created_at: nowIso(),
  });
};

const canManage = (req: AuthenticatedRequest) => managerRoles.includes(req.user!.rol);

const canViewRequisition = (req: AuthenticatedRequest, requisition: AnyDoc) => {
  if (viewAllRoles.includes(req.user!.rol)) return true;
  if (req.user!.rol !== 'Reclutador') return false;
  return Array.isArray(requisition.reclutador_ids) && requisition.reclutador_ids.includes(req.user!.uid);
};

const getRequisition = async (id: string) => {
  const doc = await adminDb.collection(COLLECTIONS.requisitions).doc(id).get();
  return doc.exists ? ({ id: doc.id, ...doc.data() } as AnyDoc) : null;
};

const assertRequisitionAccess = async (req: AuthenticatedRequest, requisitionId: string) => {
  const requisition = await getRequisition(requisitionId);
  if (!requisition || !canViewRequisition(req, requisition)) return null;
  return requisition;
};

const requisitionCampaignPrefixes: Record<string, string> = {
  'Entel Empresas': 'EN',
  Culqi: 'CU',
  Equifax: 'EQ',
  Prosegur: 'PR',
};

const getRequisitionCampaignPrefix = (campaign: string) =>
  requisitionCampaignPrefixes[normalize(campaign)] || campaignPrefix(campaign).slice(0, 2);

const getLimaYearMonth = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  return {
    year: parts.find((part) => part.type === 'year')?.value || '2026',
    month: parts.find((part) => part.type === 'month')?.value || '01',
  };
};

const buildRequisitionCode = async (campaign: string, requisitionId: string) => {
  const prefix = getRequisitionCampaignPrefix(campaign);
  const { year, month } = getLimaYearMonth();
  const base = `CON-${prefix}-${year}-${month}`;
  const counterRef = adminDb.collection(COLLECTIONS.codeCounters).doc(base);

  return adminDb.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    const initialNext = Number(counterDoc.data()?.next || 1);
    let next = Number.isFinite(initialNext) && initialNext > 0 ? initialNext : 1;
    let codigo = '';
    let codeRef = adminDb.collection(COLLECTIONS.codeLocks).doc(`${base}-${String(next).padStart(2, '0')}`);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      codigo = `${base}-${String(next).padStart(2, '0')}`;
      codeRef = adminDb.collection(COLLECTIONS.codeLocks).doc(codigo);
      const codeDoc = await transaction.get(codeRef);
      if (!codeDoc.exists) break;
      next += 1;
      codigo = '';
    }

    if (!codigo) {
      throw new Error('No se pudo generar un codigo unico. Intenta nuevamente.');
    }

    transaction.set(counterRef, {
      base,
      next: next + 1,
      updated_at: nowIso(),
    }, { merge: true });
    transaction.set(codeRef, {
      codigo,
      requisition_id: requisitionId,
      created_at: nowIso(),
    });
    return {
      codigo_base: base,
      codigo,
    };
  });
};

const reserveManualRequisitionCode = async (codigo: string, requisitionId: string, previousCode?: string) => {
  await adminDb.runTransaction(async (transaction) => {
    const codeRef = adminDb.collection(COLLECTIONS.codeLocks).doc(codigo);
    const codeDoc = await transaction.get(codeRef);
    if (codeDoc.exists && codeDoc.data()?.requisition_id !== requisitionId) {
      throw new Error('El código de convocatoria ya existe.');
    }
    transaction.set(codeRef, {
      codigo,
      requisition_id: requisitionId,
      updated_at: nowIso(),
    }, { merge: true });
    if (previousCode && previousCode !== codigo) {
      transaction.set(adminDb.collection(COLLECTIONS.codeLocks).doc(previousCode), {
        released_at: nowIso(),
        replaced_by: codigo,
      }, { merge: true });
    }
  });
};

const campaignPrefix = (value: string) =>
  normalize(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase() || 'SEL';

const buildTrainingCode = async (campaign: string, startDate: string) => {
  const [year, month, day] = startDate.split('-');
  const base = `CAP-${campaignPrefix(campaign)}${year || '2026'}${day || '01'}${month || '01'}`;
  const snapshot = await adminDb
    .collection(COLLECTIONS.sessions)
    .where('generation_code_base', '==', base)
    .get();
  return {
    generation_code_base: base,
    generation_code: `${base}-${String(snapshot.size + 1).padStart(2, '0')}`,
  };
};

router.get('/bootstrap', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const allReqs = await adminDb.collection(COLLECTIONS.requisitions).get();
  const requisitions = allReqs.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as AnyDoc))
    .filter((item) => canViewRequisition(req, item))
    .filter((item) => !item.deleted_at);

  const ids = new Set(requisitions.map((item) => String(item.id)));
  const applicantsSnapshot = await adminDb.collection(COLLECTIONS.applicants).get();
  const applicants = applicantsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as AnyDoc))
    .filter((item) => ids.has(String(item.requisition_id)))
    .filter((item) => !item.deleted_at)
    .filter((item) => req.user!.rol !== 'Reclutador' || item.reclutador_id === req.user!.uid);

  const audit = viewAllRoles.includes(req.user!.rol)
    ? (await adminDb.collection(COLLECTIONS.audit).orderBy('created_at', 'desc').limit(200).get())
        .docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    : [];

  res.json({ requisitions, applicants, audit });
});

router.post(
  '/requisitions',
  requireAuth,
  requireRole(managerRoles),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = entitySchema.omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos de convocatoria invalidos.' });
      return;
    }

    try {
      const id = `sel-req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const code = await buildRequisitionCode(normalize(parsed.data.cuenta), id);
      const timestamp = nowIso();
      const record: AnyDoc = {
        ...parsed.data,
        ...code,
        id,
        estado: parsed.data.estado || 'Activa',
        reclutador_ids: Array.isArray(parsed.data.reclutador_ids) ? parsed.data.reclutador_ids : [],
        reclutador_nombres: Array.isArray(parsed.data.reclutador_nombres) ? parsed.data.reclutador_nombres : [],
        fecha_creacion: timestamp,
        created_at: timestamp,
        updated_at: timestamp,
        created_by: req.user!.uid,
        updated_by: req.user!.uid,
      };

      await adminDb.collection(COLLECTIONS.requisitions).doc(id).set(record);
      await writeAudit(req, 'Creacion de convocatoria', id, record.nombre);
      res.status(201).json({ requisition: record });
    } catch (error) {
      console.error('Selection requisition create error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'No se pudo crear la convocatoria.',
      });
    }
  },
);

router.patch(
  '/requisitions/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Coordinador', 'Reclutador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const existing = await getRequisition(req.params.id);
    if (!existing || existing.deleted_at) {
      res.status(404).json({ message: 'Convocatoria no encontrada.' });
      return;
    }
    if (!canViewRequisition(req, existing)) {
      res.status(403).json({ message: 'No tienes acceso a esta convocatoria.' });
      return;
    }
    const changes = z.record(z.string(), z.unknown()).safeParse(req.body);
    if (!changes.success) {
      res.status(400).json({ message: 'Cambios de convocatoria invalidos.' });
      return;
    }
    delete changes.data.id;
    const requestedCode = normalize(changes.data.codigo);
    if (requestedCode && requestedCode !== normalize(existing.codigo)) {
      if (req.user!.rol !== 'Administrador') {
        res.status(403).json({ message: 'Solo el Administrador puede editar el código de convocatoria.' });
        return;
      }
      await reserveManualRequisitionCode(requestedCode, req.params.id, normalize(existing.codigo));
      changes.data.codigo = requestedCode;
      changes.data.codigo_base = 'MANUAL';
      await writeAudit(
        req,
        'Modificación manual de código de convocatoria',
        req.params.id,
        String(existing.nombre || ''),
        `${existing.codigo || ''} -> ${requestedCode}`,
      );
    } else {
      delete changes.data.codigo;
      delete changes.data.codigo_base;
    }
    const payload = { ...changes.data, updated_at: nowIso(), updated_by: req.user!.uid };
    await adminDb.collection(COLLECTIONS.requisitions).doc(req.params.id).set(payload, { merge: true });
    await writeAudit(req, 'Edición de convocatoria', req.params.id, String(existing.nombre || ''));
    res.json({ ok: true, changes: payload });
  },
);

router.delete(
  '/requisitions/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Coordinador', 'Reclutador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const existing = await getRequisition(req.params.id);
    if (!existing) {
      res.status(404).json({ message: 'Convocatoria no encontrada.' });
      return;
    }
    if (!canViewRequisition(req, existing)) {
      res.status(403).json({ message: 'No tienes acceso a esta convocatoria.' });
      return;
    }
    const reason = normalize(req.body?.reason);
    if (reason.length < 8) {
      res.status(400).json({ message: 'Indica un motivo de eliminación de al menos 8 caracteres.' });
      return;
    }
    const payload = {
      estado: 'Eliminada',
      deleted_at: nowIso(),
      deleted_by: req.user!.uid,
      deletion_reason: reason,
      updated_at: nowIso(),
      updated_by: req.user!.uid,
    };
    await adminDb.collection(COLLECTIONS.requisitions).doc(req.params.id).set(payload, { merge: true });
    await writeAudit(req, 'Eliminación lógica de convocatoria', req.params.id, String(existing.nombre || ''), reason);
    res.json({ ok: true, changes: payload });
  },
);

router.post(
  '/requisitions/:id/applicants',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Coordinador', 'Reclutador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const requisition = await assertRequisitionAccess(req, req.params.id);
    if (!requisition) {
      res.status(403).json({ message: 'No tienes acceso a esta convocatoria.' });
      return;
    }
    const parsed = entitySchema.omit({ id: true }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos de postulante invalidos.' });
      return;
    }

    const dni = normalize(parsed.data.dni);
    const nombre = normalize(parsed.data.nombre_completo);
    const telefono = normalize(parsed.data.telefono);
    if (!dni || !nombre || !telefono) {
      res.status(400).json({ message: 'DNI, nombre y teléfono son obligatorios.' });
      return;
    }

    const duplicate = await adminDb
      .collection(COLLECTIONS.applicants)
      .where('requisition_id', '==', req.params.id)
      .where('dni', '==', dni)
      .limit(1)
      .get();
    if (!duplicate.empty) {
      res.status(409).json({ message: 'Ya existe un postulante con ese DNI en esta convocatoria.' });
      return;
    }

    const timestamp = nowIso();
    const id = `sel-app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const recruiterId = req.user!.rol === 'Reclutador'
      ? req.user!.uid
      : normalize(parsed.data.reclutador_id || req.user!.uid);
    const recruiterName = req.user!.rol === 'Reclutador'
      ? req.user!.nombre
      : normalize(parsed.data.reclutador_nombre || req.user!.nombre);
    const applicant = {
      ...parsed.data,
      id,
      codigo: `POST-${dateKey()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      requisition_id: req.params.id,
      requisition_codigo: String(requisition.codigo || ''),
      cuenta: normalize(parsed.data.cuenta || requisition.cuenta),
      posicion: normalize(parsed.data.posicion || requisition.posicion),
      ciudad: normalize(parsed.data.ciudad || requisition.ciudad),
      fuente: normalize(parsed.data.fuente || requisition.fuente_principal),
      dni,
      nombre_completo: nombre,
      telefono,
      reclutador_id: recruiterId,
      reclutador_nombre: recruiterName,
      registrado_por: req.user!.uid,
      registrado_por_nombre: req.user!.nombre,
      fecha_registro: timestamp,
      fecha_asignacion: timestamp,
      ultimo_estado: parsed.data.ultimo_estado || 'Pendiente de gestión',
      etapa_actual: parsed.data.etapa_actual || 'Pendiente de gestión',
      intentos_contacto: Number(parsed.data.intentos_contacto || 0),
      convocatoria_origen: String(requisition.codigo || ''),
      created_at: timestamp,
      updated_at: timestamp,
      created_by: req.user!.uid,
      updated_by: req.user!.uid,
    };

    await adminDb.collection(COLLECTIONS.applicants).doc(id).set(applicant);
    await writeAudit(req, 'Registro manual de postulante', id, nombre);
    res.status(201).json({ applicant });
  },
);

router.post(
  '/requisitions/:id/applicants/bulk',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Coordinador', 'Reclutador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const requisition = await assertRequisitionAccess(req, req.params.id);
    if (!requisition) {
      res.status(403).json({ message: 'No tienes acceso a esta convocatoria.' });
      return;
    }
    const parsed = z.object({ applicants: z.array(z.record(z.string(), z.unknown())).min(1).max(2000) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Archivo de postulantes invalido.' });
      return;
    }

    const existing = await adminDb
      .collection(COLLECTIONS.applicants)
      .where('requisition_id', '==', req.params.id)
      .get();
    const existingDnis = new Set(existing.docs.map((doc) => normalize(doc.data().dni)));
    const seen = new Set<string>();
    const timestamp = nowIso();
    const writer = adminDb.bulkWriter();
    const created: FirebaseFirestore.DocumentData[] = [];
    const skipped: Array<{ row: number; reason: string; dni?: string }> = [];

    parsed.data.applicants.forEach((raw, index) => {
      const dni = normalize(raw.dni);
      const nombre = normalize(raw.nombre_completo);
      const telefono = normalize(raw.telefono);
      if (!dni || !nombre || !telefono) {
        skipped.push({ row: index + 2, reason: 'DNI, nombre y teléfono son obligatorios.', dni });
        return;
      }
      if (seen.has(dni) || existingDnis.has(dni)) {
        skipped.push({ row: index + 2, reason: 'DNI duplicado.', dni });
        return;
      }
      seen.add(dni);
      const id = `sel-app-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
      const recruiterId = req.user!.rol === 'Reclutador'
        ? req.user!.uid
        : normalize(raw.reclutador_id || req.user!.uid);
      const recruiterName = req.user!.rol === 'Reclutador'
        ? req.user!.nombre
        : normalize(raw.reclutador_nombre || req.user!.nombre);
      const applicant = {
        ...raw,
        id,
        codigo: `POST-${dateKey()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        requisition_id: req.params.id,
        requisition_codigo: String(requisition.codigo || ''),
        cuenta: normalize(raw.cuenta || requisition.cuenta),
        posicion: normalize(raw.posicion || requisition.posicion),
        ciudad: normalize(raw.ciudad || requisition.ciudad),
        fuente: normalize(raw.fuente || requisition.fuente_principal),
        dni,
        nombre_completo: nombre,
        telefono,
        reclutador_id: recruiterId,
        reclutador_nombre: recruiterName,
        registrado_por: req.user!.uid,
        registrado_por_nombre: req.user!.nombre,
        fecha_registro: timestamp,
        fecha_asignacion: timestamp,
        ultimo_estado: raw.ultimo_estado || 'Pendiente de gestión',
        etapa_actual: raw.etapa_actual || 'Pendiente de gestión',
        intentos_contacto: Number(raw.intentos_contacto || 0),
        convocatoria_origen: String(requisition.codigo || ''),
        created_at: timestamp,
        updated_at: timestamp,
        created_by: req.user!.uid,
        updated_by: req.user!.uid,
      };
      created.push(applicant);
      writer.set(adminDb.collection(COLLECTIONS.applicants).doc(id), applicant);
    });

    await writer.close();
    await writeAudit(req, 'Carga masiva de postulantes', req.params.id, String(requisition.nombre || ''), `${created.length} creados, ${skipped.length} omitidos`);
    res.status(201).json({ created, skipped });
  },
);

router.patch(
  '/applicants/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Coordinador', 'Reclutador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const doc = await adminDb.collection(COLLECTIONS.applicants).doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ message: 'Postulante no encontrado.' });
      return;
    }
    const current = { id: doc.id, ...doc.data() } as AnyDoc;
    if (!(await assertRequisitionAccess(req, String(current.requisition_id)))) {
      res.status(403).json({ message: 'No tienes acceso a este postulante.' });
      return;
    }
    if (req.user!.rol === 'Reclutador' && current.reclutador_id !== req.user!.uid) {
      res.status(403).json({ message: 'Solo puedes gestionar tus propios postulantes.' });
      return;
    }
    const changes = z.record(z.string(), z.unknown()).safeParse(req.body);
    if (!changes.success) {
      res.status(400).json({ message: 'Cambios de postulante invalidos.' });
      return;
    }
    delete changes.data.id;
    delete changes.data.requisition_id;

    const nextState = normalize(changes.data.ultimo_estado || current.ultimo_estado);
    const now = nowIso();
    if (
      !current.fecha_primera_gestion &&
      ['Interesado', 'No interesado', 'No responde'].includes(nextState)
    ) {
      const start = new Date(String(current.fecha_asignacion || current.fecha_registro || now)).getTime();
      const elapsed = Math.max(0, Math.round((new Date(now).getTime() - start) / 60000));
      changes.data.fecha_primera_gestion = now;
      changes.data.tiempo_primera_gestion_min = elapsed;
      changes.data.cumple_sla = elapsed <= 60;
    }

    const payload = {
      ...changes.data,
      etapa_actual: changes.data.etapa_actual || changes.data.ultimo_estado || current.etapa_actual,
      updated_at: now,
      ultima_actualizacion: now,
      updated_by: req.user!.uid,
      actualizado_por: req.user!.uid,
    };
    await adminDb.collection(COLLECTIONS.applicants).doc(req.params.id).set(payload, { merge: true });
    await writeAudit(req, 'Actualización de postulante', req.params.id, String(current.nombre_completo || ''));
    res.json({ ok: true, changes: payload });
  },
);

router.delete(
  '/applicants/:id',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Coordinador', 'Reclutador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const doc = await adminDb.collection(COLLECTIONS.applicants).doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ message: 'Postulante no encontrado.' });
      return;
    }
    const current = { id: doc.id, ...doc.data() } as AnyDoc;
    if (!(await assertRequisitionAccess(req, String(current.requisition_id)))) {
      res.status(403).json({ message: 'No tienes acceso a este postulante.' });
      return;
    }
    if (req.user!.rol === 'Reclutador' && current.reclutador_id !== req.user!.uid) {
      res.status(403).json({ message: 'Solo puedes gestionar tus propios postulantes.' });
      return;
    }
    const reason = normalize(req.body?.reason);
    if (reason.length < 8) {
      res.status(400).json({ message: 'Indica un motivo de eliminacion de al menos 8 caracteres.' });
      return;
    }
    const payload = {
      ultimo_estado: 'Eliminado',
      deleted_at: nowIso(),
      deleted_by: req.user!.uid,
      deletion_reason: reason,
      updated_at: nowIso(),
      updated_by: req.user!.uid,
    };
    await adminDb.collection(COLLECTIONS.applicants).doc(req.params.id).set(payload, { merge: true });
    await writeAudit(req, 'Eliminacion logica de postulante', req.params.id, String(current.nombre_completo || ''), reason);
    res.json({ ok: true, changes: payload });
  },
);

router.post(
  '/requisitions/:id/assign-training',
  requireAuth,
  requireRole(managerRoles),
  async (req: AuthenticatedRequest, res: Response) => {
    const requisition = await getRequisition(req.params.id);
    if (!requisition || requisition.deleted_at) {
      res.status(404).json({ message: 'Convocatoria no encontrada.' });
      return;
    }
    const parsed = z.object({
      applicantIds: z.array(z.string()).min(1).max(2000),
      training: z.record(z.string(), z.unknown()).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos de asignación invalidos.' });
      return;
    }

    const training = parsed.data.training || {};
    const formadorId = normalize(training.formador_id || requisition.training_formador_id);
    const formadorNombre = normalize(training.formador_nombre || requisition.training_formador_nombre);
    const fechaInicio = normalize(training.fecha_inicio || requisition.training_fecha_inicio);
    const fechaFin = normalize(training.fecha_fin || requisition.training_fecha_fin);
    if (!formadorId || !formadorNombre || !fechaInicio || !fechaFin) {
      res.status(400).json({ message: 'Completa formador, fecha de inicio y fecha de fin para crear la capacitación.' });
      return;
    }

    const applicantDocs = await Promise.all(
      parsed.data.applicantIds.map((id) => adminDb.collection(COLLECTIONS.applicants).doc(id).get()),
    );
    const applicants = applicantDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({ id: doc.id, ...doc.data() } as AnyDoc))
      .filter((applicant) => applicant.requisition_id === req.params.id)
      .filter((applicant) => !applicant.training_session_id);

    if (applicants.length === 0) {
      res.status(409).json({ message: 'No hay postulantes aptos nuevos para asignar.' });
      return;
    }

    const code = await buildTrainingCode(String(requisition.cuenta || ''), fechaInicio);
    const sessionId = `sel-trn-${req.params.id}-${Date.now()}`;
    const timestamp = nowIso();
    const session = {
      id: sessionId,
      nombre_generacion: code.generation_code,
      generation_code_base: code.generation_code_base,
      generation_code: code.generation_code,
      campaña: String(requisition.cuenta || ''),
      tipo_capacitacion: normalize(training.tipo_capacitacion || requisition.training_tipo || 'Capacitación regular'),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      formador_id: formadorId,
      formador_nombre: formadorNombre,
      reclutador_id: String(applicants[0].reclutador_id || req.user!.uid),
      reclutador_nombre: String(applicants[0].reclutador_nombre || req.user!.nombre),
      modalidad: normalize(training.modalidad || requisition.training_modalidad || 'Presencial'),
      turno: normalize(training.turno || 'Full time'),
      hora_capacitacion: normalize(training.hora_capacitacion || requisition.training_hora || '08:00'),
      observaciones: normalize(training.observaciones || requisition.training_observaciones),
      estado: 'Pendiente de inicio',
      fecha_creacion: timestamp,
      selection_requisition_id: req.params.id,
      selection_requisition_code: String(requisition.codigo || ''),
    };

    const survey = {
      id: `survey-${sessionId}`,
      training_session_id: sessionId,
      codigo_generacion: code.generation_code,
      campaña: String(requisition.cuenta || ''),
      formador_id: formadorId,
      formador_nombre: formadorNombre,
      estado: 'Deshabilitada',
      token: `survey-${Math.random().toString(36).slice(2, 12)}`,
      training_type: session.tipo_capacitacion,
      start_date: fechaInicio,
      end_date: fechaFin,
      created_by: req.user!.uid,
      created_at: timestamp,
    };

    const writer = adminDb.bulkWriter();
    writer.set(adminDb.collection(COLLECTIONS.sessions).doc(sessionId), session);
    writer.set(adminDb.collection(COLLECTIONS.surveys).doc(survey.id), survey);

    applicants.forEach((applicant) => {
      const [firstName, ...rest] = String(applicant.nombre_completo || '').trim().split(/\s+/);
      const participantId = `sel-part-${applicant.id}`;
      const participant = {
        id: participantId,
        training_session_id: sessionId,
        dni: String(applicant.dni || ''),
        nombres: firstName || String(applicant.nombre_completo || ''),
        apellidos: rest.join(' '),
        celular: String(applicant.telefono || ''),
        correo: String(applicant.correo || ''),
        puesto: String(applicant.posicion || ''),
        fuente_reclutamiento: String(applicant.fuente || ''),
        observacion: String(applicant.observaciones || ''),
        estado_final: 'Pendiente de gestión',
        reclutador_origen: String(applicant.reclutador_nombre || ''),
        coordinador: String(applicant.coordinador_excel || requisition.coordinador_nombre || ''),
        ciudad: String(applicant.ciudad || ''),
        estado_alta: 'Pendiente de alta',
        resultado_formacion: 'Marcar',
        selection_applicant_id: applicant.id,
        selection_requisition_id: req.params.id,
      };
      writer.set(adminDb.collection(COLLECTIONS.participants).doc(participantId), participant);
      [1, 2, 3, 4, 5].forEach((day) => {
        writer.set(adminDb.collection(COLLECTIONS.attendance).doc(`att-${participantId}-${day}`), {
          id: `att-${participantId}-${day}`,
          participant_id: participantId,
          training_session_id: sessionId,
          dia: day,
          fecha: fechaInicio,
          estado_asistencia: 'Seleccionar',
          registrado_por: req.user!.uid,
          fecha_registro: timestamp,
        });
      });
      writer.set(adminDb.collection(COLLECTIONS.applicants).doc(String(applicant.id)), {
        ultimo_estado: 'Asignado a capacitación',
        etapa_actual: 'Asignado a capacitación',
        estado_capacitacion: 'Asignado a capacitación',
        training_session_id: sessionId,
        participant_id: participantId,
        updated_at: timestamp,
        updated_by: req.user!.uid,
      }, { merge: true });
    });

    writer.set(adminDb.collection(COLLECTIONS.requisitions).doc(req.params.id), {
      estado: 'Parcialmente asignada a capacitación',
      training_session_id: sessionId,
      updated_at: timestamp,
      updated_by: req.user!.uid,
    }, { merge: true });

    await writer.close();
    await writeAudit(req, 'Asignación a capacitación', req.params.id, String(requisition.nombre || ''), `${applicants.length} postulantes`);
    res.status(201).json({ session, survey, assigned: applicants.length });
  },
);

export { router as selectionRoutes };
