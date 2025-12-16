import firebase from 'firebase/compat/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Helper to safely get env vars (handles Vite import.meta.env and standard process.env)
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return undefined;
};

// Default configuration provided by user
const defaultFirebaseConfig = {
  apiKey: "AIzaSyAy4yD3RfAuLSIuZ5U-wvDAfT95aefADrQ",
  authDomain: "safeguard-83dfc.firebaseapp.com",
  projectId: "safeguard-83dfc",
  storageBucket: "safeguard-83dfc.firebasestorage.app",
  messagingSenderId: "495369995434",
  appId: "1:495369995434:web:6db693301d7ffecc0b7cd3"
};

const apiKey = getEnv('FIREBASE_API_KEY') || getEnv('VITE_FIREBASE_API_KEY') || defaultFirebaseConfig.apiKey;

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || getEnv('VITE_FIREBASE_AUTH_DOMAIN') || defaultFirebaseConfig.authDomain,
  projectId: getEnv('FIREBASE_PROJECT_ID') || getEnv('VITE_FIREBASE_PROJECT_ID') || defaultFirebaseConfig.projectId,
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || getEnv('VITE_FIREBASE_STORAGE_BUCKET') || defaultFirebaseConfig.storageBucket,
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || defaultFirebaseConfig.messagingSenderId,
  appId: getEnv('FIREBASE_APP_ID') || getEnv('VITE_FIREBASE_APP_ID') || defaultFirebaseConfig.appId
};

// Export a flag to check if we are running in mock mode
export const isMock = !apiKey || apiKey === "mock_key";

const app = !firebase.apps.length 
  ? firebase.initializeApp(firebaseConfig) 
  : firebase.app();

export const auth = getAuth(app as any);
export const db = getFirestore(app as any);