import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithRedirect, signOut, onAuthStateChanged, db, doc, setDoc, getDoc, Timestamp, handleFirestoreError, OperationType } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { LogIn, LogOut, FileText, BarChart3, Settings, User as UserIcon, Loader2, Upload, CheckCircle2, AlertCircle, Sparkles, FileDown, ArrowRight, Github, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Resume, AnalysisResult } from './types';
import ResumeUpload from './components/ResumeUpload';
import AnalysisDashboard from './components/AnalysisDashboard';
import ResumeGenerator from './components/ResumeGenerator';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'profile' | 'generator'>('upload');
  const [currentResume, setCurrentResume] = useState<Resume | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<AnalysisResult | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!auth || !db) {
      console.error('Firebase services not initialized');
      setLoading(false);
      return;
    }

    fetch('/api/health')
      .then(res => res.json())
      .then(data => console.log('Backend Health:', data))
      .catch(err => console.error('Backend Health Error:', err));

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: Timestamp.now(),
              role: 'user',
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth not initialized correctly.');
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login Error:', error);
      let message = 'Failed to sign in. Please try again.';
      if (error.code === 'auth/popup-blocked') {
        message = 'Sign-in popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for sign-in. Please contact your Firebase administrator to whitelist localhost or this domain in the Firebase Console Settings.';
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      if (!auth) throw new Error('Firebase Auth not initialized.');
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Email Auth Error:', error);
      let msg = error.message || 'Authentication failed.';
      if (error.code === 'auth/invalid-credential') msg = "Invalid email or password.";
      if (error.code === 'auth/email-already-in-use') msg = "This email is already registered.";
      if (error.code === 'auth/weak-password') msg = "Password should be at least 6 characters.";
      setAuthError(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveTab('upload');
      setCurrentResume(null);
      setCurrentAnalysis(null);
      setAuthError(null);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  const backgroundGradients = (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute top-0 left-[20%] w-[500px] h-[500px] bg-brand-primary/20 rounded-full blur-[120px] animate-blob mix-blend-screen opacity-50" />
      <div className="absolute top-[20%] right-[10%] w-[600px] h-[600px] bg-brand-secondary/20 rounded-full blur-[100px] animate-blob animation-delay-2000 mix-blend-screen opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[150px] animate-blob animation-delay-4000 mix-blend-screen opacity-50" />
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        {backgroundGradients}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full glass-panel rounded-3xl p-10 text-center relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent pointer-events-none" />
          
          <div className="w-20 h-20 bg-gray-800/80 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-700 shadow-2xl relative z-10 hover:rotate-12 transition-transform duration-500">
            <Sparkles className="w-10 h-10 text-brand-primary animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2 relative z-10">ResumeAI</h1>
          <p className="text-gray-400 mb-8 text-sm font-medium relative z-10 leading-relaxed">
            {isSignUp ? "Create a new account to begin." : "Welcome back. Log in to continue."}
          </p>
          
          {authError && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col gap-2 text-red-400 text-left relative z-10 backdrop-blur-md"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium">{authError}</p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4 relative z-10 text-left mb-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider pl-1">Email Space</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 transition-all font-mono" 
                placeholder="developer@example.com"
                required 
              />
            </div>
            <div className="space-y-2 mb-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-wider pl-1">Security Key</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/50 transition-all font-mono" 
                placeholder="********"
                required 
              />
            </div>
            
            <button
              type="submit"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 bg-brand-primary text-white hover:bg-violet-500 font-black uppercase tracking-wider py-4 px-6 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] hover:-translate-y-1 mt-2 disabled:opacity-50"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? "Initialize Profile" : "Bypass Security")}
            </button>
          </form>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              className="text-sm font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {isSignUp ? "Already have access? Authorize." : "Need clearance? Request access."}
            </button>

            <div className="w-full flex items-center gap-4 py-2">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-xs text-gray-600 font-bold uppercase">or connect network</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3.5 px-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google Auth Interface
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative">
      {backgroundGradients}
      
      {/* Sidebar */}
      <aside className="w-72 glass-panel border-r-0 border-r border-gray-800 flex flex-col fixed h-full z-20">
        <div className="p-8 flex items-center gap-4 border-b border-white/5">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="font-black text-2xl tracking-tight text-white">ResumeAI</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-3">
          {[
            { id: 'upload', icon: Upload, label: 'Upload & Analyze' },
            { id: 'dashboard', icon: BarChart3, label: 'Analytics' },
            { id: 'generator', icon: FileText, label: 'AI Generator' },
            { id: 'profile', icon: UserIcon, label: 'Profile' }
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-medium group relative overflow-hidden",
                  isActive ? "text-white shadow-lg shadow-black/20" : "text-gray-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div layoutId="activeTab" className="absolute inset-0 bg-gradient-to-r from-brand-primary/20 to-transparent border-l-4 border-brand-primary -z-10" />
                )}
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive ? "text-brand-primary scale-110" : "group-hover:scale-110")} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 mb-4 backdrop-blur-xl transition-all hover:bg-white/10 cursor-pointer">
            <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full border-2 border-brand-primary/50 shadow-lg object-cover" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl text-red-400 hover:text-white hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-semibold"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-10 relative z-10">
        <div className="max-w-6xl mx-auto mb-8">
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="glass-card border-green-500/30 text-green-400 p-5 rounded-2xl mb-6 flex items-center justify-between shadow-xl shadow-green-900/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2bg-green-500/20 rounded-full">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <span className="font-bold">{successMessage}</span>
                </div>
                <button onClick={() => setSuccessMessage(null)} className="text-green-500 hover:text-white transition-colors p-2">
                  <LogOut className="w-5 h-5 rotate-45" />
                </button>
              </motion.div>
            )}
            {authError && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="glass-card border-red-500/30 text-red-400 p-5 rounded-2xl mb-6 flex items-center justify-between shadow-xl shadow-red-900/20"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-red-500/20 rounded-full">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <span className="font-bold">{authError}</span>
                </div>
                <button onClick={() => setAuthError(null)} className="text-red-500 hover:text-white transition-colors p-2">
                  <LogOut className="w-5 h-5 rotate-45" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
              <ResumeUpload user={user} onAnalysisComplete={(resume, analysis) => {
                  setCurrentResume(resume);
                  setCurrentAnalysis(analysis);
                  setActiveTab('dashboard');
                }} />
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
              <AnalysisDashboard resume={currentResume} analysis={currentAnalysis} user={user} />
            </motion.div>
          )}

          {activeTab === 'generator' && (
            <motion.div key="generator" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
              <ResumeGenerator user={user} />
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="max-w-3xl mx-auto">
              <div className="glass-panel p-10 relative overflow-hidden rounded-[2.5rem]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px]" />
                <h2 className="text-3xl font-black text-white mb-8 relative z-10">User Profile</h2>
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-8">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-3xl blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-300" />
                      <img src={user.photoURL} alt={user.displayName} className="w-32 h-32 rounded-3xl border-4 border-gray-800 relative z-10 object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white mb-2">{user.displayName}</h3>
                      <p className="text-lg text-gray-400 mb-4">{user.email}</p>
                      <div className="inline-flex items-center px-4 py-2 rounded-xl bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(139,92,246,0.2)]">
                        {user.role} Member
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
                    <div className="p-6 rounded-3xl glass-card">
                      <p className="text-xs text-brand-primary uppercase font-black tracking-widest mb-2">Member Since</p>
                      <p className="text-white text-xl font-bold">
                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                    <div className="p-6 rounded-3xl glass-card">
                      <p className="text-xs text-brand-secondary uppercase font-black tracking-widest mb-2">Account Role</p>
                      <p className="text-white text-xl font-bold capitalize">{user.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
