import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  changeUserPasswordByAdmin,
  createPlatformUser,
  deactivatePlatformUser,
  updatePlatformUser,
} from '../services/userService.js';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
const canManageUsers = [requireAuth, requireRole(['Administrador', 'Analista'])];

const roleSchema = z.enum([
  'Administrador',
  'Analista',
  'Reclutador',
  'Formador',
  'Coordinador',
  'Sistemas',
]);

const stateSchema = z.enum(['Activo', 'Inactivo']);

const createUserSchema = z.object({
  nombre: z.string().min(1),
  usuario: z.string().min(1),
  password: z.string().min(6),
  rol: roleSchema,
  estado: stateSchema,
});

const updateUserSchema = z.object({
  nombre: z.string().min(1).optional(),
  usuario: z.string().min(1).optional(),
  rol: roleSchema.optional(),
  estado: stateSchema.optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6),
});

router.post('/', canManageUsers, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Datos de usuario invalidos.' });
    return;
  }

  try {
    const user = await createPlatformUser(parsed.data, {
      uid: req.user!.uid,
      nombre: req.user!.nombre,
    });
    res.status(201).json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    res.status(message === 'El usuario ya existe.' ? 409 : 500).json({ message });
  }
});

router.patch('/:uid', canManageUsers, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Datos de usuario invalidos.' });
    return;
  }

  try {
    await updatePlatformUser(req.params.uid, parsed.data, {
      uid: req.user!.uid,
      nombre: req.user!.nombre,
    });
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error interno.';
    const status = message === 'El usuario ya existe.' ? 409 : 500;
    res.status(status).json({ message });
  }
});

router.post('/:uid/password', canManageUsers, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'La nueva contrasena es requerida.' });
    return;
  }

  try {
    await changeUserPasswordByAdmin(req.params.uid, parsed.data.newPassword, {
      uid: req.user!.uid,
      nombre: req.user!.nombre,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Password change error:', error);
    const message = error instanceof Error ? error.message : 'Error interno.';
    res.status(message === 'Usuario no encontrado.' ? 404 : 500).json({ message });
  }
});

router.patch('/:uid/deactivate', canManageUsers, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await deactivatePlatformUser(req.params.uid, {
      uid: req.user!.uid,
      nombre: req.user!.nombre,
    });
    res.json({ ok: true });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ message: 'Error interno.' });
  }
});

export { router as userRoutes };
