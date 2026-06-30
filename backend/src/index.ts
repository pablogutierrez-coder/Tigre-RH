import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistCandidates = [
  path.resolve(__dirname, '../../dist'),
  path.resolve(__dirname, '../public'),
];
const frontendDistPath = frontendDistCandidates.find((candidate) =>
  fs.existsSync(path.join(candidate, 'index.html')),
);

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_ORIGIN,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ].filter(Boolean),
);

const isLocalDevelopmentOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS.'));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, frontend: Boolean(frontendDistPath) });
});

app.get('/config.js', (_req, res) => {
  const publicConfig = {
    VITE_FIREBASE_API_KEY: process.env.VITE_FIREBASE_API_KEY || '',
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || '',
    VITE_FIREBASE_STORAGE_BUCKET: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    VITE_FIREBASE_MESSAGING_SENDER_ID:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    VITE_FIREBASE_APP_ID: process.env.VITE_FIREBASE_APP_ID || '',
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '',
  };

  res
    .type('application/javascript')
    .set('Cache-Control', 'no-store')
    .send(`window.__FDR_CONFIG__ = ${JSON.stringify(publicConfig)};`);
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

if (frontendDistPath) {
  app.use(express.static(frontendDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`FDR backend listening on port ${port}`);
  console.log(
    frontendDistPath
      ? `Serving frontend from ${frontendDistPath}`
      : `Frontend build not found. Checked: ${frontendDistCandidates.join(', ')}`,
  );
});
