import { initializeApp } from 'firebase/app';
import * as realAuth from 'firebase/auth';
import * as realFirestore from 'firebase/firestore';
import * as mock from './firebase-mock';
import firebaseConfig from '../firebase-applet-config.json';

const useMocks = import.meta.env.VITE_USE_MOCK_FIREBASE === 'true';

let app: any;
let db: any;
let auth: any;
let googleProvider: any;
let isMockActive = false;

if (!useMocks) {
  try {
    app = initializeApp(firebaseConfig);
    db = realFirestore.getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = realAuth.getAuth(app);
    googleProvider = new realAuth.GoogleAuthProvider();
    isMockActive = false;
  } catch (error) {
    console.error("Firebase initialization failed, falling back to mocks:", error);
    isMockActive = true;
  }
} else {
  isMockActive = true;
}

if (isMockActive) {
  // Use mocks for local development
  db = {}; 
  auth = mock.mockAuth;
  googleProvider = mock.mockGoogleProvider;
}

export { app, db, auth, googleProvider };

// Export the correct implementation based on environment
export const collection = isMockActive ? mock.mockCollection : realFirestore.collection;
export const doc = isMockActive ? mock.mockDoc : realFirestore.doc;
export const setDoc = isMockActive ? mock.mockSetDoc : realFirestore.setDoc;
export const getDoc = isMockActive ? mock.mockGetDoc : realFirestore.getDoc;
export const getDocs = isMockActive ? mock.mockGetDocs : realFirestore.getDocs;
export const query = isMockActive ? mock.mockQuery : realFirestore.query;
export const where = isMockActive ? mock.mockWhere : realFirestore.where;
export const deleteDoc = isMockActive ? mock.mockDeleteDoc : realFirestore.deleteDoc;
export const addDoc = isMockActive ? mock.mockAddDoc : realFirestore.addDoc;
export const getDocFromServer = isMockActive ? mock.mockGetDocFromServer : realFirestore.getDocFromServer;

export const Timestamp = isMockActive ? mock.MockTimestamp : realFirestore.Timestamp;

export const signInWithPopup = isMockActive ? mock.mockSignInWithPopup : realAuth.signInWithPopup;
export const signInWithEmailAndPassword = isMockActive ? mock.mockSignInWithEmailAndPassword : realAuth.signInWithEmailAndPassword;
export const createUserWithEmailAndPassword = isMockActive ? mock.mockCreateUserWithEmailAndPassword : realAuth.createUserWithEmailAndPassword;
export const signInWithRedirect = isMockActive ? mock.mockSignInWithPopup : realAuth.signInWithRedirect;
export const signOut = isMockActive ? mock.mockSignOut : realAuth.signOut;
export const onAuthStateChanged = isMockActive ? mock.mockOnAuthStateChanged : realAuth.onAuthStateChanged;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  if (isMockActive) return;
  try {
    if(db) await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
