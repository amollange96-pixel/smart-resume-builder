import React, { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithRedirect, signOut, onAuthStateChanged, db, doc, setDoc, getDoc, Timestamp, handleFirestoreError, OperationType } from './firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { LogIn, LogOut, FileText, BarChart3, Settings, User as UserIcon, Loader2, Upload, CheckCircle2, AlertCircle, Sparkles, FileDown, ArrowRight, Github, Mail, Eye, EyeOff, Shield, X } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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
          const mockUserRole = (firebaseUser as any).role || 'user';
          const mockUserTier = (firebaseUser as any).tier || 'free';
          const isMock = firebaseUser.uid.startsWith('mock-') || firebaseUser.uid.startsWith('local-mock-');

          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            // If local storage settings differ for mock user, update the database document
            if (isMock && (userData.role !== mockUserRole || userData.tier !== mockUserTier)) {
              const updatedUser = { ...userData, role: mockUserRole, tier: mockUserTier };
              await setDoc(doc(db, 'users', firebaseUser.uid), updatedUser);
              setUser(updatedUser);
            } else {
              setUser(userData);
            }
          } else {
            const defaultName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
            const defaultPhoto = firebaseUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=8b5cf6&color=fff`;
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: defaultName,
              photoURL: defaultPhoto,
              createdAt: Timestamp.now(),
              role: mockUserRole,
              tier: mockUserTier
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
          
          // Check for Stripe success
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('success') === 'true') {
            await setDoc(doc(db, 'users', firebaseUser.uid), { tier: 'premium' }, { merge: true });
            setUser(prev => prev ? { ...prev, tier: 'premium' } : null);
            setSuccessMessage("Payment successful! You've been upgraded to Premium.");
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Also update local storage if in mock mode
            const storedUser = localStorage.getItem('mockUser');
            if (storedUser) {
               const p = JSON.parse(storedUser);
               p.tier = 'premium';
               localStorage.setItem('mockUser', JSON.stringify(p));
            }
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setSuccessMessage(null);
    
    if (!email.trim() || !password.trim()) {
      setAuthError('Please enter both email and password.');
      return;
    }

    try {
      if (!auth) {
        throw new Error('Authentication is not initialized.');
      }
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMessage('Account created and logged in successfully!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error('Authentication Error:', error);
      
      let message = 'Failed to authenticate. Please try again.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/email-already-in-use') {
        message = 'This email address is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password should be at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Email/Password authentication is disabled. Please go to your Firebase Console -> Authentication -> Sign-in method tab and enable the Email/Password provider.';
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      if (!auth) {
        throw new Error('Authentication is not initialized.');
      }
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Login Error:', error);
      let message = 'Failed to sign in with Google. Please try again.';
      if (error.code === 'auth/popup-blocked') {
        message = 'Sign-in popup was blocked. Please allow popups for this site.';
      } else if (error.code === 'auth/unauthorized-domain') {
        message = 'This domain is not authorized for sign-in. Please contact your Firebase administrator to whitelist localhost or this domain in the Firebase Console Settings.';
      } else if (error.code === 'auth/operation-not-allowed') {
        message = 'Google sign-in is disabled. Please go to your Firebase Console -> Authentication -> Sign-in method tab and enable the Google provider.';
      } else if (error.message) {
        message = error.message;
      }
      setAuthError(message);
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
            Welcome back. Sign in to continue.
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

          <form onSubmit={handleAuth} className="relative z-10 flex flex-col gap-4 mt-6 text-left">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                  <Mail className="w-5 h-5" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-white font-medium py-3.5 pl-12 pr-4 rounded-2xl transition-all duration-300 outline-none placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 hover:border-white/20 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-white font-medium py-3.5 pl-5 pr-12 rounded-2xl transition-all duration-300 outline-none placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-brand-primary to-brand-secondary hover:opacity-95 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] cursor-pointer mt-2"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setAuthError(null);
                }}
                className="text-sm text-gray-400 hover:text-white transition-colors underline cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>

            <div className="flex items-center my-2">
              <div className="flex-1 border-t border-white/5" />
              <span className="px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">or continue with</span>
              <div className="flex-1 border-t border-white/5" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] group cursor-pointer"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </button>

            <div className="mt-6 p-4 bg-white/5 border border-white/5 rounded-2xl text-center">
              <p className="text-xs text-gray-500 font-semibold mb-1">LOCAL DEVELOPMENT CREDS</p>
              <p className="text-xs text-brand-primary font-bold">
                Email: <span className="text-gray-300">developer@example.com</span>
              </p>
              <p className="text-xs text-brand-primary font-bold">
                Password: <span className="text-gray-300">password</span>
              </p>
            </div>
          </form>
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
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=8b5cf6&color=fff`} alt={user.displayName} className="w-12 h-12 rounded-full border-2 border-brand-primary/50 shadow-lg object-cover" referrerPolicy="no-referrer" />
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
                      <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=8b5cf6&color=fff`} alt={user.displayName} className="w-32 h-32 rounded-3xl border-4 border-gray-800 relative z-10 object-cover" referrerPolicy="no-referrer" />
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

                  <div className="p-8 rounded-3xl glass-card border border-brand-primary/30 relative overflow-hidden mt-6">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/20 rounded-full blur-[40px]" />
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                      <div>
                        <p className="text-xs text-brand-primary uppercase font-black tracking-widest mb-2">Current Plan</p>
                        <h4 className="text-2xl text-white font-black mb-2 capitalize">{user.tier || 'Free'} Tier</h4>
                        <p className="text-gray-400 text-sm">
                          {user.tier === 'premium' 
                            ? "You have full access to Deep AI Rewrites and Premium Insights." 
                            : "Upgrade to Premium to unlock Deep AI Rewrites and full ATS Insights."}
                        </p>
                      </div>
                      {user.tier !== 'premium' && (
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/create-razorpay-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.uid })
                              });
                              const data = await res.json();
                              
                              if (data.mock) {
                                window.location.href = '/?success=true';
                                return;
                              }

                              if (!data.id) throw new Error(data.error || 'Failed to create order');

                              const options = {
                                key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy',
                                amount: data.amount,
                                currency: data.currency,
                                name: "ResumeAI Premium",
                                description: "Unlock full AI Recommendations and Deep Rewrites",
                                order_id: data.id,
                                handler: function (response: any) {
                                  window.location.href = '/?success=true';
                                },
                                prefill: {
                                  name: user.displayName || '',
                                  email: user.email || ''
                                },
                                theme: { color: "#8b5cf6" }
                              };

                              const rzp = new (window as any).Razorpay(options);
                              rzp.on('payment.failed', function (response: any){
                                alert("Payment Failed: " + response.error.description);
                              });
                              rzp.open();
                            } catch (err) { 
                              console.error(err);
                              alert('Failed to start checkout. Ensure your server is restarted and Razorpay keys are configured.'); 
                            }
                          }} 
                          className="px-6 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-black uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:-translate-y-1 whitespace-nowrap"
                        >
                          Upgrade for $2/mo
                        </button>
                      )}
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
