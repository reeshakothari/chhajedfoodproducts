'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  if (!auth) auth = getAuth(app);
  return auth;
}

export async function signIn(email: string, password: string): Promise<User> {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase is not configured.');
  const cred = await signInWithEmailAndPassword(a, email.trim(), password);
  return cred.user;
}

export async function signOut(): Promise<void> {
  const a = getFirebaseAuth();
  if (a) await fbSignOut(a);
}

/** Resolves with the current user (or null) once Firebase has restored session. */
export function waitForUser(): Promise<User | null> {
  const a = getFirebaseAuth();
  if (!a) return Promise.resolve(null);
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(a, (user) => {
      unsub();
      resolve(user);
    });
  });
}

export { onAuthStateChanged };
export type { User };
