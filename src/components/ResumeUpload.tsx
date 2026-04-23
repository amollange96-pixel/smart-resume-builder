import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowRight, FileType } from 'lucide-react';
import { analyzeResume } from '../services/geminiService';
import { db, collection, addDoc, Timestamp, handleFirestoreError, OperationType } from '../firebase';
import { User, Resume, AnalysisResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ResumeUploadProps {
  user: User;
  onAnalysisComplete: (resume: Resume, analysis: AnalysisResult) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      let encoded = reader.result?.toString() || '';
      // Extract base64 payload cleanly
      const payload = encoded.includes(',') ? encoded.split(',')[1] : encoded;
      resolve(payload);
    };
    reader.onerror = error => reject(error);
  });
};

export default function ResumeUpload({ user, onAnalysisComplete }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Ensure your file is a valid PDF document.');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Missing Resume: You must upload a PDF document first.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Missing Job Description: Please paste the job description on the right so the AI knows what to target.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setStatus('Packaging Document for Analysis...');
      const base64Data = await fileToBase64(file);
      
      setStatus('Saving resume metadata...');
      const resumeData = {
        userId: user.uid,
        fileName: file.name,
        fileType: file.type || 'application/pdf',
        uploadDate: Timestamp.now(),
        content: 'Multi-Modal PDF'
      };
      
      let resumeRef;
      try {
        resumeRef = await addDoc(collection(db, 'resumes'), resumeData);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'resumes');
        throw new Error('Could not save resume down to database.');
      }
      
      const resume: Resume = { id: resumeRef.id, ...resumeData };

      setStatus('Vision Engine Analyzing PDF (this may take a moment)...');
      const analysisData = await analyzeResume(base64Data, jobDescription);
      
      setStatus('Finalizing impressive results...');
      const finalAnalysis: AnalysisResult = {
        id: '',
        resumeId: resumeRef.id,
        userId: user.uid,
        jobDescription,
        score: analysisData.score || 0,
        breakdown: analysisData.breakdown || {
          skillsMatch: 0,
          experienceMatch: 0,
          keywordDensity: 0,
          formatting: 0,
          grammar: 0
        },
        missingSkills: analysisData.missingSkills || [],
        weaknesses: analysisData.weaknesses || [],
        suggestions: analysisData.suggestions || [],
        optimizedContent: analysisData.optimizedContent || '',
        createdAt: Timestamp.now()
      };
      
      let analysisRef;
      try {
        analysisRef = await addDoc(collection(db, 'analysisResults'), finalAnalysis);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'analysisResults');
        throw new Error('Could not save analysis down to database.');
      }
      
      finalAnalysis.id = analysisRef.id;

      onAnalysisComplete(resume, finalAnalysis);
    } catch (err: any) {
      console.error('Upload/Analysis Error Full Stack:', err);
      let errorMessage = err.message || err.toString() || 'An unexpected error occurred during processing.';
      
      if (errorMessage.includes('PERMISSION_DENIED')) {
        errorMessage = 'Database permission denied. Please ensure you are signed in correctly.';
      } else if (errorMessage.includes('quota')) {
        errorMessage = 'AI Analysis quota exceeded. Please try again in a few minutes.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network Error')) {
        errorMessage = 'Network connection failed while talking to Google AI.';
      }
      
      // Explicitly set string error
      setError(`Analysis Failed: ${errorMessage}`);
    } finally {
      // ALWAYS resolve loading state, so the button never spins forever regardless of error history
      setLoading(false);
      setStatus('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 tracking-tight">AI Resume Optimizer</h1>
        <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto leading-relaxed">Upload your PDF and paste the target job description. Our advanced AI will score and dynamically rewrite your resume to beat modern ATS systems.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: File Upload */}
        <div className="space-y-6">
          <div 
            className={`glass-panel p-10 rounded-[2.5rem] border-2 border-dashed ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10'} hover:border-brand-primary/50 transition-all duration-300 group relative overflow-hidden backdrop-blur-xl hover:shadow-[0_0_40px_rgba(139,92,246,0.15)] cursor-pointer`}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) {
                 if (droppedFile.type !== 'application/pdf' && !droppedFile.name.toLowerCase().endsWith('.pdf')) {
                    setError('Ensure your file is a valid PDF document.');
                    return;
                 }
                 setFile(droppedFile);
                 setError(null);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex flex-col items-center text-center space-y-6 relative z-10 pointer-events-none">
              <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-brand-primary/20 border border-brand-primary/20">
                <Upload className="w-10 h-10 text-brand-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-white mb-2">
                  {file ? file.name : 'Click Here to Select PDF'}
                </p>
                <p className="text-sm text-gray-400 font-medium tracking-wide">Drag & drop forced overwrite enabled</p>
              </div>
              {file && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-full text-xs font-black uppercase tracking-widest border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                  <CheckCircle2 className="w-4 h-4" />
                  File Successfully Locked In
                </div>
              )}
            </div>
          </div>

          <div className="glass-card p-8 rounded-[2.5rem] space-y-5">
            <div className="flex items-center gap-3 text-white font-bold text-lg">
              <FileType className="w-6 h-6 text-brand-secondary" />
              Supported Formats
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-sm text-gray-300 font-medium transition-colors hover:bg-white/10">
                <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_#8b5cf6]" />
                PDF
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-sm text-gray-500 font-medium opacity-50">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                DOCX (Soon)
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Job Description */}
        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-secondary/10 rounded-full blur-[50px] pointer-events-none" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3 text-white font-bold text-lg">
                <FileText className="w-6 h-6 text-brand-secondary" />
                Target Job Description
              </div>
              <span className="text-xs text-brand-secondary/80 font-bold uppercase tracking-widest px-3 py-1 bg-brand-secondary/10 rounded-full border border-brand-secondary/20">Paste Source</span>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here so we can analyze the keywords and responsibilities..."
              className="flex-1 w-full min-h-[350px] p-6 rounded-3xl bg-black/20 border border-white/10 focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/30 transition-all resize-none text-gray-300 placeholder:text-gray-600 font-medium leading-relaxed relative z-10"
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-400 glass-card"
          >
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-center pt-6">
        <button
          onClick={handleUpload}
          disabled={loading}
          className="group relative flex items-center gap-4 bg-white hover:bg-gray-100 disabled:bg-gray-800 disabled:text-gray-500 text-gray-900 font-black py-5 px-14 rounded-full transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] disabled:shadow-none hover:-translate-y-1 transform overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 via-brand-primary/10 to-brand-primary/0 translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              <span className="relative z-10">{status}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-brand-primary" />
              <span className="relative z-10 text-lg uppercase tracking-wider">Analyze & Optimize</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10 text-brand-secondary" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
