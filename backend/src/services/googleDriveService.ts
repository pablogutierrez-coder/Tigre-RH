import { Readable } from 'node:stream';
import { google } from 'googleapis';

const DEFAULT_CV_FOLDER_ID = '1dBjb9zWBK81Rzaezg0oOGqMPPBfN7SRv';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

const getDriveClient = () => {
  const email = process.env.GOOGLE_DRIVE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
  const key = (process.env.GOOGLE_DRIVE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY)
    ?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error('Faltan las credenciales de Google Drive en el backend.');
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: [DRIVE_SCOPE],
  });

  return google.drive({ version: 'v3', auth });
};

export const getCvDriveFolderId = () =>
  process.env.GOOGLE_DRIVE_FOLDER_ID || DEFAULT_CV_FOLDER_ID;

export const uploadCvToGoogleDrive = async (params: {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  participantId: string;
  recordId: string;
  uploadedBy: string;
}) => {
  const drive = getDriveClient();
  const folderId = getCvDriveFolderId();
  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: params.fileName,
      parents: [folderId],
      appProperties: {
        participantId: params.participantId,
        recordId: params.recordId,
        uploadedBy: params.uploadedBy,
        source: 'tigre-rh',
      },
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: 'id,name,mimeType,size,createdTime,webViewLink,webContentLink,parents',
  });

  if (!response.data.id) {
    throw new Error('Google Drive no devolvio el identificador del archivo.');
  }

  return {
    id: response.data.id,
    name: response.data.name || params.fileName,
    mimeType: response.data.mimeType || params.mimeType,
    size: Number(response.data.size || params.buffer.length),
    createdTime: response.data.createdTime || new Date().toISOString(),
    webViewLink: response.data.webViewLink || '',
    webContentLink: response.data.webContentLink || '',
    folderId,
  };
};

export const downloadCvFromGoogleDrive = async (fileId: string) => {
  const drive = getDriveClient();
  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(response.data as ArrayBuffer);
};

export const deleteCvFromGoogleDrive = async (fileId: string) => {
  const drive = getDriveClient();
  await drive.files.delete({ fileId, supportsAllDrives: true });
};
