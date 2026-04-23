import { initializeApp } from 'firebase/app';
import * as realAuth from 'firebase/auth';
import * as realFirestore from 'firebase/firestore';
import * as mock from './firebase-mock';
import firebaseConfig from '../firebase-applet-config.json';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let app: any;
let db: any;
let auth: any;
let googleProvider: any;

if (!isLocal) {
  try {
    app = initializeApp(firebaseConfig);
    db = realFirestore.getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = realAuth.getAuth(app);
    googleProvider = new realAuth.GoogleAuthProvider();
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
} else {
  // Use mocks for local development
  db = {}; 
  auth = mock.mockAuth;
  googleProvider = mock.mockGoogleProvider;
}

export { app, db, auth, googleProvider };

// Export the correct implementation based on environment
export const collection = isLocal ? mock.mockCollection : realFirestore.collection;
export const doc = isLocal ? mock.mockDoc : realFirestore.doc;
export const setDoc = isLocal ? mock.mockSetDoc : realFirestore.setDoc;
export const getDoc = isLocal ? mock.mockGetDoc : realFirestore.getDoc;
export const getDocs = isLocal ? mock.mockGetDocs : realFirestore.getDocs;
export const query = isLocal ? mock.mockQuery : realFirestore.query;
export const where = isLocal ? mock.mockWhere : realFirestore.where;
export const deleteDoc = isLocal ? mock.mockDeleteDoc : realFirestore.deleteDoc;
export const addDoc = isLocal ? mock.mockAddDoc : realFirestore.addDoc;
export const getDocFromServer = isLocal ? mock.mockGetDocFromServer : realFirestore.getDocFromServer;

export const Timestamp = isLocal ? mock.MockTimestamp : realFirestore.Timestamp;

export const signInWithPopup = isLocal ? mock.mockSignInWithPopup : realAuth.signInWithPopup;
export const signInWithEmailAndPassword = isLocal ? mock.mockSignInWithEmailAndPassword : realAuth.signInWithEmailAndPassword;
export const createUserWithEmailAndPassword = isLocal ? mock.mockCreateUserWithEmailAndPassword : realAuth.createUserWithEmailAndPassword;
export const signInWithRedirect = isLocal ? mock.mockSignInWithPopup : realAuth.signInWithRedirect;
export const signOut = isLocal ? mock.mockSignOut : realAuth.signOut;
export const onAuthStateChanged = isLocal ? mock.mockOnAuthStateChanged : realAuth.onAuthStateChanged;

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
  if (isLocal) return;
  try {
    if(db) await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
