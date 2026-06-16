// src/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─── Firebase config ──────────────────────────────────────────────────────────
// Priority: VITE_ env vars (set in .env.local) → firebase-applet-config fallback
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || "AIzaSyBDhbWgcam1Tl1IRQ2lBW1NMMkQGqypY1k",
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || "gen-lang-client-0005443220.firebaseapp.com",
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || "gen-lang-client-0005443220",
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || "gen-lang-client-0005443220.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "477906512166",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || "1:477906512166:web:1e6462c8fef3a46ebaf9e7",
};

// ─── Initialize Firebase (avoid duplicate app error in HMR) ───────────────────
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app, "ai-studio-dba8ee12-6798-4f25-8575-7c1fee3fcb0a");

// ─── Google Auth Provider ─────────────────────────────────────────────────────
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
// Force account picker every time so users can switch accounts
googleProvider.setCustomParameters({ prompt: "select_account" });

// ─── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Sign in with Google using a popup (preferred for localhost / desktop).
 * Falls back to redirect if popup is blocked.
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    // Popup blocked → fall back to redirect
    if (
      error.code === "auth/popup-blocked" ||
      error.code === "auth/popup-closed-by-user"
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null; // page will reload; use handleRedirectResult on mount
    }
    console.error("Google sign-in error:", error);
    throw error;
  }
}

/**
 * Call once on app mount to pick up the result of a redirect sign-in.
 */
export async function handleRedirectResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error("Redirect result error:", error);
    return null;
  }
}

/**
 * Sign out the current user.
 */
export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export type { User };
