import dotenv from 'dotenv';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config({ path: '.env.local' });

if (!getApps().length) {
  initializeApp();
}

export const adminDb = getFirestore();
export const adminAuth = getAuth();
