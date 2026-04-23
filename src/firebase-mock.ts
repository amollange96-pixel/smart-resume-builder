// Mock Firebase implementation for local development using LocalStorage
// Bypasses the "domain not authorized" error without needing Firebase Console changes.

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// --- AUTH MOCK --- //
let _mockUser: any = null;
if (isLocal) {
  const storedUser = localStorage.getItem('mockUser');
  if (storedUser) {
    _mockUser = JSON.parse(storedUser);
  }
}

export const mockAuth = {
  get currentUser() {
    return _mockUser;
  }
};

export const mockGoogleProvider = {};

export const mockSignInWithPopup = async (authObj: any, provider: any) => {
  const newUser = {
    uid: 'local-mock-user-12345',
    email: 'localdeveloper@example.com',
    displayName: 'Local Developer',
    photoURL: 'https://ui-avatars.com/api/?name=Local+Developer&background=8b5cf6&color=fff',
    emailVerified: true,
    isAnonymous: false,
    providerData: [{
      providerId: 'google.com',
      displayName: 'Local Developer',
      email: 'localdeveloper@example.com',
      photoURL: 'https://ui-avatars.com/api/?name=Local+Developer&background=8b5cf6&color=fff'
    }]
  };
  localStorage.setItem('mockUser', JSON.stringify(newUser));
  _mockUser = newUser;
  // Reloading the window resets the state properly and immediately signs the user in according to the useEffect logic
  window.location.reload();
  return { user: newUser };
};

export const mockSignOut = async () => {
  localStorage.removeItem('mockUser');
  _mockUser = null;
  window.location.reload();
};

export const mockSignInWithEmailAndPassword = async (authObj: any, email: string, password: any) => {
  if (password.length < 6) throw new Error("Password must be at least 6 characters long.");
  
  // Just simulate a successful login by caching the email locally
  const newUser = {
    uid: 'local-mock-email-' + btoa(email).slice(0, 8),
    email: email,
    displayName: email.split('@')[0],
    photoURL: `https://ui-avatars.com/api/?name=${email}&background=0ea5e9&color=fff`,
    emailVerified: false,
    isAnonymous: false,
    providerData: []
  };
  localStorage.setItem('mockUser', JSON.stringify(newUser));
  _mockUser = newUser;
  window.location.reload();
  return { user: newUser };
};

export const mockCreateUserWithEmailAndPassword = async (authObj: any, email: string, password: any) => {
  return mockSignInWithEmailAndPassword(authObj, email, password); // For the mock, creation and login act identically
};

let _authListeners: ((user: any) => void)[] = [];
export const mockOnAuthStateChanged = (authObj: any, cb: (user: any) => void) => {
  _authListeners.push(cb);
  setTimeout(() => cb(_mockUser), 0);
  return () => {
    _authListeners = _authListeners.filter(l => l !== cb);
  };
};

// --- FIRESTORE MOCK --- //
const getDb = () => JSON.parse(localStorage.getItem('mockFirestore') || '{}');
const saveDb = (db: any) => localStorage.setItem('mockFirestore', JSON.stringify(db));

export class MockTimestamp {
  seconds: number;
  nanoseconds: number;
  constructor(date = new Date()) {
    this.seconds = Math.floor(date.getTime() / 1000);
    this.nanoseconds = (date.getTime() % 1000) * 1000000;
  }
  static now() { return new MockTimestamp(); }
  toDate() { return new Date(this.seconds * 1000 + this.nanoseconds / 1000000); }
}

export const mockCollection = (db: any, path: string) => path;

export const mockDoc = (db: any, colPath: string, id?: string) => {
  return { col: colPath, id: id || Math.random().toString(36).slice(2) };
};

export const mockSetDoc = async (docRef: any, data: any) => {
  const db = getDb();
  if (!db[docRef.col]) db[docRef.col] = {};
  db[docRef.col][docRef.id] = data;
  saveDb(db);
};

export const mockGetDoc = async (docRef: any) => {
  const db = getDb();
  const data = db[docRef.col]?.[docRef.id];
  return {
    exists: () => !!data,
    data: () => data,
    id: docRef.id
  };
};

export const mockGetDocs = async (queryObj: any) => {
  const db = getDb();
  const col = db[queryObj.col] || {};
  let items = Object.entries(col).map(([id, data]) => ({
    id,
    data: () => data
  }));
  
  if (queryObj.whereClause) {
    const { field, op, value } = queryObj.whereClause;
    items = items.filter(item => {
      // @ts-ignore
      const itemVal = item.data()[field];
      if (op === '==') return itemVal === value;
      return true;
    });
  }
  
  return {
    docs: items,
    forEach: (cb: any) => items.forEach(cb),
    empty: items.length === 0
  };
};

export const mockQuery = (col: string, ...args: any[]) => {
  return { col, whereClause: args[0] };
};

export const mockWhere = (field: string, op: string, value: any) => {
  return { field, op, value };
};

export const mockAddDoc = async (col: string, data: any) => {
  const ref = mockDoc(null, col);
  await mockSetDoc(ref, data);
  return ref;
};

export const mockDeleteDoc = async (docRef: any) => {
  const db = getDb();
  if (db[docRef.col]) {
    delete db[docRef.col][docRef.id];
    saveDb(db);
  }
};

export const mockGetDocFromServer = async (docRef: any) => {
  return mockGetDoc(docRef);
};
