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
  const defaultGoogleUser = {
    uid: 'mock-google-user-id',
    email: 'developer@example.com',
    displayName: 'Google Developer',
    photoURL: 'https://ui-avatars.com/api/?name=Google+Developer&background=8b5cf6&color=fff',
    emailVerified: true,
    isAnonymous: false,
    providerData: [],
    tier: 'premium',
    role: 'admin'
  };
  localStorage.setItem('mockUser', JSON.stringify(defaultGoogleUser));
  _mockUser = defaultGoogleUser;
  window.location.reload();
  return { user: defaultGoogleUser };
};

export const mockSignOut = async () => {
  localStorage.removeItem('mockUser');
  _mockUser = null;
  window.location.reload();
};

const getMockCredentials = () => {
  try {
    const creds = JSON.parse(localStorage.getItem('mockAuthCredentials') || '{}');
    if (Object.keys(creds).length === 0) {
      const defaultUser = {
        uid: 'mock-developer-user-id',
        email: 'developer@example.com',
        displayName: 'Developer',
        photoURL: 'https://ui-avatars.com/api/?name=Developer&background=8b5cf6&color=fff',
        emailVerified: true,
        isAnonymous: false,
        providerData: [],
        tier: 'premium',
        role: 'admin'
      };
      creds['developer@example.com'] = {
        password: 'password',
        user: defaultUser
      };
      localStorage.setItem('mockAuthCredentials', JSON.stringify(creds));
    }
    return creds;
  } catch {
    return {};
  }
};

const saveMockCredentials = (creds: any) => {
  localStorage.setItem('mockAuthCredentials', JSON.stringify(creds));
};

export const mockSignInWithEmailAndPassword = async (authObj: any, email: string, password: any) => {
  const normalizedEmail = email.toLowerCase().trim();
  const creds = getMockCredentials();
  
  if (!creds[normalizedEmail]) {
    const err = new Error("Firebase: There is no user record corresponding to this identifier (auth/invalid-credential).");
    (err as any).code = 'auth/invalid-credential';
    throw err;
  }
  
  if (creds[normalizedEmail].password !== password) {
    const err = new Error("Firebase: The password is invalid or the user does not have a password (auth/invalid-credential).");
    (err as any).code = 'auth/invalid-credential';
    throw err;
  }
  
  const user = creds[normalizedEmail].user;
  localStorage.setItem('mockUser', JSON.stringify(user));
  _mockUser = user;
  window.location.reload();
  return { user };
};

export const mockCreateUserWithEmailAndPassword = async (authObj: any, email: string, password: any) => {
  if (!email || !email.includes('@')) {
    const err = new Error("Firebase: Auth error (auth/invalid-email).");
    (err as any).code = 'auth/invalid-email';
    throw err;
  }
  if (!password || password.length < 6) {
    const err = new Error("Firebase: Password should be at least 6 characters (auth/weak-password).");
    (err as any).code = 'auth/weak-password';
    throw err;
  }
  
  const creds = getMockCredentials();
  const normalizedEmail = email.toLowerCase().trim();
  
  if (creds[normalizedEmail]) {
    const err = new Error("Firebase: The email address is already in use by another account (auth/email-already-in-use).");
    (err as any).code = 'auth/email-already-in-use';
    throw err;
  }
  
  const uid = 'local-mock-email-' + btoa(normalizedEmail).slice(0, 8);
  const newUser = {
    uid: uid,
    email: normalizedEmail,
    displayName: normalizedEmail.split('@')[0],
    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(normalizedEmail.split('@')[0])}&background=0ea5e9&color=fff`,
    emailVerified: false,
    isAnonymous: false,
    providerData: [],
    tier: 'free',
    role: 'user'
  };
  
  // Save credentials
  creds[normalizedEmail] = {
    password: password,
    user: newUser
  };
  saveMockCredentials(creds);
  
  localStorage.setItem('mockUser', JSON.stringify(newUser));
  _mockUser = newUser;
  
  // Write to mock Firestore users database directly to ensure it exists
  const firestoreDb = JSON.parse(localStorage.getItem('mockFirestore') || '{}');
  if (!firestoreDb['users']) firestoreDb['users'] = {};
  firestoreDb['users'][uid] = {
    uid,
    email: normalizedEmail,
    displayName: newUser.displayName,
    photoURL: newUser.photoURL,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
    role: 'user',
    tier: 'free'
  };
  localStorage.setItem('mockFirestore', JSON.stringify(firestoreDb));

  window.location.reload();
  return { user: newUser };
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

export const mockSetDoc = async (docRef: any, data: any, options?: any) => {
  const db = getDb();
  if (!db[docRef.col]) db[docRef.col] = {};
  if (options?.merge && db[docRef.col][docRef.id]) {
    db[docRef.col][docRef.id] = { ...db[docRef.col][docRef.id], ...data };
  } else {
    db[docRef.col][docRef.id] = data;
  }
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
