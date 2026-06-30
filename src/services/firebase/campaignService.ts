import { collection, getDocs, query, where } from 'firebase/firestore';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db } from '../../lib/firebase';
import type { Campaign } from '../../types';
import {
  createDocumentWithId,
  getCollectionDocuments,
  updateDocument,
} from './firestoreHelpers';

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

export const getCampaigns = () =>
  getCollectionDocuments<Campaign>(FDR_COLLECTIONS.campaigns);

export const getActiveCampaigns = async () => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.campaigns),
    where('estado', '==', 'Activo'),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Campaign);
};

export const createCampaign = (campaign: Campaign) =>
  createDocumentWithId(FDR_COLLECTIONS.campaigns, campaign.id, campaign);

export const updateCampaign = (id: string, data: Partial<Campaign>) =>
  updateDocument<Campaign>(FDR_COLLECTIONS.campaigns, id, data);

export const archiveCampaign = (id: string) =>
  updateDocument<Campaign>(FDR_COLLECTIONS.campaigns, id, { estado: 'Inactivo' });
