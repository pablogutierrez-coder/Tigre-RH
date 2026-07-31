import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  annulTrainingVariableEvaluation,
  closeTrainingVariableEvaluation,
  createTrainingVariableEvaluation,
  getTrainingVariableEvaluationById,
  listTrainingVariableEvaluations,
  reopenTrainingVariableEvaluation,
  updateTrainingVariableEvaluation,
} from '../services/trainingVariableService.js';
import {
  type AuthenticatedRequest,
  requireAuth,
} from '../utils/authMiddleware.js';

const router = Router();

const inputSchema = z.object({
  anio: z.coerce.number().int().min(2020).max(2100),
  mes: z.coerce.number().int().min(1).max(12),
  id_formador: z.string().trim().min(1),
  nombre_formador: z.string().trim().min(1),
  observacion_general: z.string().trim().optional().default(''),
  porcentaje_retencion: z.coerce.number().min(0).max(100),
  porcentaje_produccion_individual: z.coerce.number().min(0).max(100),
  porcentaje_produccion_grupal: z.coerce.number().min(0),
  porcentaje_satisfaccion: z.coerce.number().min(0).max(100),
  porcentaje_administrativo: z.coerce.number().min(0).max(100),
  observacion_administrativa: z.string().trim().optional().default(''),
});

const asActor = (req: AuthenticatedRequest) => ({
  uid: req.user!.uid,
  rol: req.user!.rol,
  nombre: req.user!.nombre,
});

const sendError = (res: Response, error: unknown) => {
  const message = error instanceof Error ? error.message : 'Error interno.';
  const status =
    message.includes('permisos') || message.includes('Solo el administrador') ? 403 :
    message.includes('no encontrada') ? 404 :
    message.includes('Ya existe') ? 409 :
    400;
  res.status(status).json({ message });
};

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evaluations = await listTrainingVariableEvaluations(asActor(req));
    res.json({ evaluations });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evaluation = await getTrainingVariableEvaluationById(req.params.id, asActor(req));
    res.json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message || 'Datos de evaluación inválidos.' });
    return;
  }

  try {
    const evaluation = await createTrainingVariableEvaluation(parsed.data, asActor(req));
    res.status(201).json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message || 'Datos de evaluación inválidos.' });
    return;
  }

  try {
    const evaluation = await updateTrainingVariableEvaluation(req.params.id, parsed.data, asActor(req));
    res.json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/:id/cerrar', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evaluation = await closeTrainingVariableEvaluation(req.params.id, asActor(req));
    res.json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/:id/reabrir', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evaluation = await reopenTrainingVariableEvaluation(req.params.id, asActor(req));
    res.json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/:id/anular', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const evaluation = await annulTrainingVariableEvaluation(req.params.id, asActor(req));
    res.json({ evaluation });
  } catch (error) {
    sendError(res, error);
  }
});

export { router as trainingVariableRoutes };
