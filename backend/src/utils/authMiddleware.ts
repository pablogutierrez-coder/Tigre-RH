import type { NextFunction, Request, Response } from 'express';
import { adminAuth, adminDb } from '../firebaseAdmin.js';

export interface AuthenticatedUser {
  uid: string;
  rol: string;
  usuario: string;
  nombre: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ message: 'Token requerido.' });
    return;
  }

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch (error) {
    const authError = error as { code?: string; message?: string };
    console.error('Firebase token validation failed:', {
      code: authError?.code || 'unknown',
      message: authError?.message || 'Unknown authentication error',
    });
    res.status(401).json({
      message: 'Token invalido.',
      reason: authError?.code || 'auth/unknown',
    });
    return;
  }

  try {
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      res.status(401).json({ message: 'Perfil de usuario no encontrado.' });
      return;
    }

    const profile = userDoc.data();
    if (profile?.estado !== 'Activo') {
      res.status(403).json({ message: 'Usuario inactivo.' });
      return;
    }

    req.user = {
      uid: decoded.uid,
      rol: String(profile?.rol || ''),
      usuario: String(profile?.usuario_normalizado || profile?.usuario || ''),
      nombre: String(profile?.nombre || ''),
    };

    next();
  } catch (error) {
    const profileError = error as { code?: string; message?: string };
    console.error('Firebase user profile load failed:', {
      code: profileError?.code || 'unknown',
      message: profileError?.message || 'Unknown profile error',
    });
    res.status(503).json({ message: 'No se pudo validar el perfil del usuario. Intenta nuevamente.' });
  }
};

export const requireRole =
  (roles: string[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: 'Token requerido.' });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ message: 'No tienes permisos para esta accion.' });
      return;
    }

    next();
  };
