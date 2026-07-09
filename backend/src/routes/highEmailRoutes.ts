import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  type AuthenticatedRequest,
  requireAuth,
  requireRole,
} from '../utils/authMiddleware.js';

const router = Router();
const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const schema = z.object({
  recipient: z.string().email(),
  rows: z.array(z.object({
    dni: z.string(),
    nombre: z.string(),
    campana: z.string(),
    capacitacion: z.string(),
    fechaAlta: z.string(),
  })).min(1).max(1000),
});

router.post(
  '/send',
  requireAuth,
  requireRole(['Administrador', 'Analista', 'Reclutador', 'Coordinador']),
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Correo o listado de altas invalido.' });
      return;
    }
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
      res.status(500).json({ message: 'Brevo no esta configurado.' });
      return;
    }

    const bodyRows = parsed.data.rows.map((row) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.dni)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.nombre)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.campana)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.capacitacion)}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeHtml(row.fechaAlta || '-')}</td>
      </tr>`).join('');
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Tigre RH',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: parsed.data.recipient }],
        subject: `Altas confirmadas FDR (${parsed.data.rows.length})`,
        htmlContent: `<html><body style="font-family:Arial,sans-serif;color:#1e293b">
          <h2>Altas confirmadas - FDR</h2>
          <p>Enviado por ${escapeHtml(req.user!.nombre)}.</p>
          <table style="border-collapse:collapse;width:100%;font-size:13px">
            <thead><tr><th>DNI</th><th>Nombre</th><th>Campana</th><th>Capacitacion</th><th>Fecha alta</th></tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body></html>`,
      }),
    });
    const data = await response.json().catch(() => null) as
      | { message?: string; messageId?: string }
      | null;
    if (!response.ok) {
      res.status(502).json({ message: data?.message || 'Brevo no pudo enviar las altas.' });
      return;
    }
    res.json({ ok: true, messageId: data?.messageId || '' });
  },
);

export { router as highEmailRoutes };
