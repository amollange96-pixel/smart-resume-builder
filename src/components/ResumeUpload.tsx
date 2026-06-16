import React, { useState, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, ArrowRight, FileType } from 'lucide-react';
import { analyzeResume } from '../services/geminiService';
import { db, collection, addDoc, Timestamp, handleFirestoreError, OperationType } from '../firebase';
import { User, Resume, AnalysisResult } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import GrammarInput from './GrammarInput';
import mammoth from 'mammoth';

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
  const [loading, setLoading] = useState<'free' | 'premium' | false>(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const name = selectedFile.name.toLowerCase();
      if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
        setError('Ensure your file is a valid PDF or DOCX document.');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async (tier: 'free' | 'premium') => {
    if (!file) {
      setError('Missing Resume: You must upload a PDF or DOCX document first.');
      return;
    }
    // Job Description is now optional, so we remove the strict empty validation.

    setLoading(tier);
    setError(null);

    try {
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      let resumePayload = '';
      let resumeContentString = '';

      if (isPdf) {
        setStatus('Packaging PDF Document...');
        resumePayload = await fileToBase64(file);
        resumeContentString = 'Multi-Modal PDF';
      } else {
        setStatus('Extracting DOCX Text Content...');
        // Read the DOCX file as an ArrayBuffer
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
              resolve(e.target.result);
            } else {
              reject(new Error('Failed to read DOCX file as ArrayBuffer'));
            }
          };
          reader.onerror = (e) => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });

        // Parse DOCX to raw text using mammoth
        const result = await mammoth.extractRawText({ arrayBuffer });
        resumePayload = result.value || '';
        resumeContentString = result.value || '';
        
        if (!resumePayload.trim()) {
          throw new Error('The uploaded DOCX file appears to be empty or contains no readable text.');
        }
      }

      setStatus('Saving resume metadata...');
      const resumeData = {
        userId: user.uid,
        fileName: file.name,
        fileType: file.type || (isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        uploadDate: Timestamp.now(),
        content: resumeContentString
      };

      let resumeRef;
      try {
        resumeRef = await addDoc(collection(db, 'resumes') as any, resumeData);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'resumes');
        throw new Error('Could not save resume down to database.');
      }

      const resume: Resume = { id: resumeRef.id, ...resumeData };

      setStatus(isPdf
        ? `Vision Engine Analyzing PDF (${tier === 'premium' ? 'Premium Deep Scan' : 'Free Structural Scan'})...`
        : `AI Engine Analyzing DOCX (${tier === 'premium' ? 'Premium Deep Scan' : 'Free Structural Scan'})...`
      );
      const analysisData = await analyzeResume(resumePayload, jobDescription, tier, isPdf);

      setStatus('Finalizing impressive results...');
      const finalAnalysis: AnalysisResult = {
        id: '',
        resumeId: resumeRef.id,
        userId: user.uid,
        jobDescription,
        tier: tier,
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
        topCompanies: analysisData.topCompanies || [],
        originalContent: analysisData.originalContent || '',
        optimizedContent: analysisData.optimizedContent || '',
        createdAt: Timestamp.now()
      };

      let analysisRef;
      try {
        analysisRef = await addDoc(collection(db, 'analysisResults') as any, finalAnalysis);
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
        <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto leading-relaxed">Upload your PDF and optionally paste the target job description. Our advanced AI will score and dynamically rewrite your resume to beat modern ATS systems.</p>
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
                const name = droppedFile.name.toLowerCase();
                if (!name.endsWith('.pdf') && !name.endsWith('.docx')) {
                  setError('Ensure your file is a valid PDF or DOCX document.');
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
              accept=".pdf,.docx"
              className="hidden"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex flex-col items-center text-center space-y-6 relative z-10 pointer-events-none">
              <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-brand-primary/20 border border-brand-primary/20">
                <Upload className="w-10 h-10 text-brand-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-white mb-2">
                  {file ? file.name : 'Click Here to Select PDF or DOCX'}
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
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3 text-sm text-gray-300 font-medium transition-colors hover:bg-white/10">
                <div className="w-2 h-2 rounded-full bg-brand-secondary shadow-[0_0_10px_#10b981]" />
                DOCX
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
                Target Job Description (Optional)
              </div>
              <span className="text-xs text-brand-secondary/80 font-bold uppercase tracking-widest px-3 py-1 bg-brand-secondary/10 rounded-full border border-brand-secondary/20">Paste Source</span>
            </div>
            <GrammarInput
              name="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the complete job description here if you have a specific role in mind, otherwise we will perform a general resume analysis and critique..."
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

      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-6">
        <button
          onClick={() => handleUpload('free')}
          disabled={!!loading}
          className="group relative flex items-center justify-center gap-4 bg-white/5 hover:bg-white/10 disabled:bg-gray-800 disabled:text-gray-500 border border-white/10 hover:border-white/20 text-white font-bold py-5 px-10 rounded-full transition-all duration-300 disabled:shadow-none hover:-translate-y-1 transform overflow-hidden cursor-pointer"
        >
          {loading === 'free' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              <span className="relative z-10">{status}</span>
            </>
          ) : (
            <>
              <span className="relative z-10 text-lg uppercase tracking-wider">Free Quick Scan</span>
            </>
          )}
        </button>

        <button
          onClick={() => handleUpload('premium')}
          disabled={!!loading}
          className="group relative flex items-center justify-center gap-4 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-secondary hover:to-brand-primary disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-500 text-white font-black py-5 px-14 rounded-full transition-all duration-300 shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:shadow-[0_0_60px_rgba(139,92,246,0.6)] disabled:shadow-none hover:-translate-y-1 transform overflow-hidden cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]" />
          {loading === 'premium' ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span className="relative z-10">{status}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-6 h-6 text-white" />
              <span className="relative z-10 text-lg uppercase tracking-wider ml-1">Deep Premium AI Rewrite</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform relative z-10 text-white" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
