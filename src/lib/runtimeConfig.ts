type RuntimeConfig = Partial<{
  VITE_FIREBASE_API_KEY: string;
  VITE_FIREBASE_AUTH_DOMAIN: string;
  VITE_FIREBASE_PROJECT_ID: string;
  VITE_FIREBASE_STORAGE_BUCKET: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  VITE_FIREBASE_APP_ID: string;
  VITE_API_BASE_URL: string;
}>;

declare global {
  interface Window {
    __FDR_CONFIG__?: RuntimeConfig;
  }
}

export const runtimeConfig = window.__FDR_CONFIG__ || {};

export const getRuntimeEnv = (key: keyof RuntimeConfig) =>
  runtimeConfig[key] || import.meta.env[key];
