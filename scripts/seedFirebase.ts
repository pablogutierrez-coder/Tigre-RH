import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../src/constants/firebaseCollections';
import {
  INITIAL_ATTENDANCE,
  INITIAL_AUDIT_LOGS,
  INITIAL_CAMPAIGNS,
  INITIAL_CONFIRMATIONS,
  INITIAL_PARTICIPANTS,
  INITIAL_REOPEN_REQUESTS,
  INITIAL_RESPONSES,
  INITIAL_SESSIONS,
  INITIAL_SURVEYS,
  INITIAL_USERS,
} from '../src/db/initialData';
import type { User } from '../src/types';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  throw new Error(`Missing Firebase env vars in .env.local: ${missingKeys.join(', ')}`);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const removeUndefinedValues = <T>(obj: T): T => {
  if (Array.isArray(obj)) return obj.map(removeUndefinedValues) as T;

  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.entries(obj as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        if (value !== undefined) {
          acc[key] = removeUndefinedValues(value);
        }
        return acc;
      },
      {} as Record<string, unknown>,
    ) as T;
  }

  return obj;
};

const stripPassword = (user: User) => {
  const { password: _password, ...profile } = user;
  return profile;
};

const seedCollection = async <T extends { id: string }>(
  collectionName: string,
  records: T[],
) => {
  for (const record of records) {
    await setDoc(
      doc(db, collectionName, record.id),
      removeUndefinedValues(record),
      { merge: true },
    );
  }
  console.log(`Seeded ${records.length} records into ${collectionName}`);
};

const seedAppSettings = async () => {
  await setDoc(doc(db, FDR_COLLECTIONS.appSettings, 'attendance_statuses'), {
    values: ['Seleccionar', 'Asistió', 'Tardanza', 'Faltó', 'Desistió', 'Pendiente'],
  });
  await setDoc(doc(db, FDR_COLLECTIONS.appSettings, 'resultado_formacion'), {
    values: ['Marcar', 'Apto', 'No apto'],
  });
  await setDoc(doc(db, FDR_COLLECTIONS.appSettings, 'roles'), {
    values: [
      'Administrador',
      'Analista',
      'Reclutador',
      'Formador',
      'Coordinador',
      'Sistemas',
    ],
  });
  await setDoc(doc(db, FDR_COLLECTIONS.appSettings, 'session_statuses'), {
    values: [
      'Pendiente de inicio',
      'En curso',
      'Activa',
      'Campaña cerrada',
      'Capacitación cerrada',
    ],
  });
  console.log('Seeded app_settings');
};

const main = async () => {
  await seedCollection(
    FDR_COLLECTIONS.users,
    INITIAL_USERS.map(stripPassword),
  );
  await seedCollection(FDR_COLLECTIONS.campaigns, INITIAL_CAMPAIGNS);
  await seedCollection(FDR_COLLECTIONS.sessions, INITIAL_SESSIONS);
  await seedCollection(FDR_COLLECTIONS.participants, INITIAL_PARTICIPANTS);
  await seedCollection(FDR_COLLECTIONS.attendance, INITIAL_ATTENDANCE);
  await seedCollection(FDR_COLLECTIONS.confirmations, INITIAL_CONFIRMATIONS);
  await seedCollection(FDR_COLLECTIONS.reopens, INITIAL_REOPEN_REQUESTS);
  await seedCollection(FDR_COLLECTIONS.logs, INITIAL_AUDIT_LOGS);
  await seedCollection(FDR_COLLECTIONS.surveys, INITIAL_SURVEYS);
  await seedCollection(FDR_COLLECTIONS.responses, INITIAL_RESPONSES);
  await seedAppSettings();
  console.log('Firebase seed completed.');
};

main().catch((error) => {
  console.error('Firebase seed failed:', error);
  process.exit(1);
});
