/**
 * Firebase Client SDK Authentication Service (rideate-project).
 * Connects directly to Google Identity / Firebase Auth to provide
 * REAL Google Sign-In Popup (accounts.google.com).
 */

import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export const getFirebaseWebApiKey = () => {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey) return envKey;

  const storedKey = localStorage.getItem('RIDEEAT_FIREBASE_API_KEY');
  const geminiKey = localStorage.getItem('RIDEEAT_GEMINI_KEY');

  // Prevent using the Gemini API key (which belongs to a different GCP project) for Firebase
  if (storedKey && geminiKey && storedKey === geminiKey) {
    localStorage.removeItem('RIDEEAT_FIREBASE_API_KEY');
    return '';
  }

  return storedKey || '';
};

export const setFirebaseWebApiKey = (key) => {
  if (key && key.trim()) {
    localStorage.setItem('RIDEEAT_FIREBASE_API_KEY', key.trim());
  }
};

export const clearFirebaseWebApiKey = () => {
  localStorage.removeItem('RIDEEAT_FIREBASE_API_KEY');
};

export const getFirebaseApp = async () => {
  const apiKey = getFirebaseWebApiKey();
  const existingApps = getApps();
  if (existingApps.length > 0) {
    const existing = existingApps[0];
    if (existing.options && existing.options.apiKey === apiKey) {
      return existing;
    }
    try {
      await deleteApp(existing);
    } catch (e) {
      console.warn('Could not cleanly delete existing firebase app:', e);
    }
  }

  const firebaseConfig = {
    apiKey: apiKey || 'AIzaSyPlaceholderKeyForInit',
    authDomain: 'rideate-project.firebaseapp.com',
    projectId: 'rideate-project',
    storageBucket: 'rideate-project.appspot.com',
    messagingSenderId: '107127608434',
    appId: '1:107127608434:web:rideeat-soa'
  };

  return initializeApp(firebaseConfig);
};

export const getFirebaseAuth = async () => {
  const app = await getFirebaseApp();
  return getAuth(app);
};

/**
 * Trigger official Google Sign-In popup window (accounts.google.com).
 * Returns real Google user profile and Firebase ID Token.
 */
export const signInWithGooglePopup = async () => {
  const auth = await getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email.split('@')[0],
    photoURL: user.photoURL,
    idToken
  };
};

export const firebaseSignOut = async () => {
  try {
    const auth = await getFirebaseAuth();
    await signOut(auth);
  } catch {
    // Ignore sign out errors
  }
};
