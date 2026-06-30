import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { authRoutes } from './routes/authRoutes.js';
import { userRoutes } from './routes/userRoutes.js';

const app = express();
const port = Number(process.env.PORT || 8080);

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_ORIGIN,
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
  ].filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS.'));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

app.listen(port, '0.0.0.0', () => {
  console.log(`FDR backend listening on port ${port}`);
});
