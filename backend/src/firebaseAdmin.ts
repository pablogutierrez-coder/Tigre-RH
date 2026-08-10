import 'dotenv/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const normalizeEnvValue = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const unquoted = (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  )
    ? trimmed.slice(1, -1)
    : trimmed;
  return unquoted.trim();
};

const privateKey = normalizeEnvValue(process.env.FIREBASE_PRIVATE_KEY)
  ?.replace(/\\n/g, '\n')
  .replace(/\r/g, '');
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
const projectId = normalizeEnvValue(process.env.FIREBASE_PROJECT_ID);
const databaseURL = process.env.FIREBASE_DATABASE_URL ||
  (projectId ? `https://${projectId}-default-rtdb.firebaseio.com` : undefined);

if (!getApps().length) {
  const clientEmail = normalizeEnvValue(process.env.FIREBASE_CLIENT_EMAIL);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin environment variables.');
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket,
    databaseURL,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
adminDb.settings({
  preferRest: true,
  ignoreUndefinedProperties: true,
});
export const adminRealtimeDb = getDatabase();
export const adminStorage = getStorage();
