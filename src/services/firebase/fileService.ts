import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytes,
  type UploadMetadata,
} from 'firebase/storage';
import { FDR_COLLECTIONS } from '../../constants/firebaseCollections';
import { db, storage } from '../../lib/firebase';
import {
  createDocumentWithId,
  getDocumentById,
  updateDocument,
} from './firestoreHelpers';

export interface FdrFileRecord {
  id: string;
  path: string;
  fileName: string;
  contentType?: string;
  size?: number;
  sessionId?: string;
  reportId?: string;
  surveyId?: string;
  uploadedAt: string;
  metadata?: Record<string, unknown>;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

const getRequiredDb = () => {
  if (!db) throw new Error('Firebase Firestore is not configured. Check .env.local.');
  return db;
};

const getRequiredStorage = () => {
  if (!storage) throw new Error('Firebase Storage is not configured. Check .env.local.');
  return storage;
};

const uploadFile = async (
  path: string,
  file: File,
  metadata?: UploadMetadata,
) => {
  const snapshot = await uploadBytes(ref(getRequiredStorage(), path), file, metadata);
  return snapshot.ref.fullPath;
};

export const uploadTrainingFile = (
  sessionId: string,
  file: File,
  metadata?: UploadMetadata,
) => uploadFile(`training-files/${sessionId}/${file.name}`, file, metadata);

export const uploadReportFile = (
  reportId: string,
  file: File,
  metadata?: UploadMetadata,
) => uploadFile(`report-files/${reportId}/${file.name}`, file, metadata);

export const uploadSurveyFile = (
  surveyId: string,
  file: File,
  metadata?: UploadMetadata,
) => uploadFile(`survey-files/${surveyId}/${file.name}`, file, metadata);

export const getDownloadUrl = (path: string) =>
  getDownloadURL(ref(getRequiredStorage(), path));

export const createFileRecord = (data: FdrFileRecord) =>
  createDocumentWithId(FDR_COLLECTIONS.fileRecords, data.id, data);

export const getFilesBySession = async (sessionId: string) => {
  const q = query(
    collection(getRequiredDb(), FDR_COLLECTIONS.fileRecords),
    where('sessionId', '==', sessionId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as FdrFileRecord);
};

export const getFileRecordById = (fileId: string) =>
  getDocumentById<FdrFileRecord>(FDR_COLLECTIONS.fileRecords, fileId);

export const deleteFileRecordLogical = (fileId: string, deletedBy: string) =>
  updateDocument<FdrFileRecord>(FDR_COLLECTIONS.fileRecords, fileId, {
    isDeleted: true,
    deletedAt: new Date().toISOString(),
    deletedBy,
  });
