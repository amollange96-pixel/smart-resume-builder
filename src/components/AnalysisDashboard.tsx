import React, { useState } from 'react';
import { Resume, AnalysisResult, User } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  CheckCircle2, AlertCircle, Lightbulb, Sparkles, FileText, 
  ChevronRight, Download, Copy, Check, ArrowLeft, Target, 
  Brain, Award, TrendingUp, Loader2, Lock, Briefcase, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { downloadAsPDF, downloadAsDoc, downloadAsTxt } from '../services/downloadService';

interface AnalysisDashboardProps {
  resume: Resume | null;
  analysis: AnalysisResult | null;
  user: User;
}

export default function AnalysisDashboard({ resume, analysis, user }: AnalysisDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'compare' | 'optimized' | 'cover-letter'>('overview');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  
  const [showResumeDownloads, setShowResumeDownloads] = useState(false);
  const [showLetterDownloads, setShowLetterDownloads] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const optResumeRef = React.useRef<HTMLDivElement>(null);
  const coverLetterRef = React.useRef<HTMLDivElement>(null);

  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      const res = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      const data = await res.json();
      
      if (data.mock) {
        // If no real keys are set, use mock redirect
        window.location.href = '/?success=true';
        return;
      }

      if (!data.id) {
        throw new Error(data.error || 'Failed to create order');
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'dummy', // Replace with real key in production frontend if needed, but usually passed from backend or env
        amount: data.amount,
        currency: data.currency,
        name: "ResumeAI Premium",
        description: "Unlock full AI Recommendations and Deep Rewrites",
        order_id: data.id,
        handler: function (response: any) {
          // On success, redirect to trigger the Firebase upgrade logic
          window.location.href = '/?success=true';
        },
        prefill: {
          name: user.displayName || '',
          email: user.email || ''
        },
        theme: {
          color: "#8b5cf6" // brand-primary
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        alert("Payment Failed: " + response.error.description);
        setUpgrading(false);
      });
      rzp.open();

    } catch (err) {
      console.error(err);
      alert('Upgrade failed. Please try again.');
      setUpgrading(false);
    }
  };

  const generateLetter = async () => {
    if (!resume || !analysis) return;
    setGeneratingLetter(true);
    try {
      const { generateCoverLetter } = await import('../services/geminiService');
      const letter = await generateCoverLetter(resume.content, analysis.jobDescription || '');
      setCoverLetter(letter);
      setActiveSection('cover-letter');
    } catch (error) {
      console.error('Error generating cover letter:', error);
    } finally {
      setGeneratingLetter(false);
    }
  };

  if (!resume || !analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 opacity-50" />
        </div>
        <p className="text-xl font-medium tracking-wide">No analysis data available. Please upload a resume first.</p>
      </div>
    );
  }

  const hasJobDesc = !!(analysis.jobDescription && analysis.jobDescription.trim());

  const chartData = [
    { name: 'Skills', value: analysis.breakdown.skillsMatch },
    { name: 'Experience', value: analysis.breakdown.experienceMatch },
    { name: 'Keywords', value: analysis.breakdown.keywordDensity },
    { name: 'Formatting', value: analysis.breakdown.formatting },
    { name: 'Grammar', value: analysis.breakdown.grammar },
  ];

  const radarData = chartData.map(item => ({
    subject: item.name,
    A: item.value,
    fullMark: 100,
  }));

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getScoreStroke = (score: number) => {
    if (score >= 80) return '#4ade80';
    if (score >= 60) return '#fbbf24';
    return '#f87171';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'border-green-500/30 bg-green-900/10 shadow-[0_0_50px_rgba(74,222,128,0.1)]';
    if (score >= 60) return 'border-amber-500/30 bg-amber-900/10 shadow-[0_0_50px_rgba(251,191,36,0.1)]';
    return 'border-red-500/30 bg-red-900/10 shadow-[0_0_50px_rgba(248,113,113,0.1)]';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">Analysis Results</h1>
          <p className="text-gray-400 flex items-center gap-2 font-medium">
            <FileText className="w-5 h-5 text-brand-primary" />
            <span className="text-white">{resume.fileName}</span> 
            <span className="opacity-50">•</span> 
            Analyzed {analysis.createdAt?.toDate ? analysis.createdAt.toDate().toLocaleDateString() : 'Today'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveSection('overview')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${activeSection === 'overview' ? 'bg-white text-gray-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection('compare')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${activeSection === 'compare' ? 'bg-white text-gray-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white'}`}
          >
            Compare
          </button>
          <button
            onClick={() => setActiveSection('optimized')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all uppercase tracking-wider ${activeSection === 'optimized' ? 'bg-white text-gray-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white'}`}
          >
            Optimized Resume
          </button>
          <button
            onClick={coverLetter ? () => setActiveSection('cover-letter') : generateLetter}
            disabled={generatingLetter}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 uppercase tracking-wider ${activeSection === 'cover-letter' ? 'bg-white text-gray-900 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-gray-400 hover:text-white'}`}
          >
            {generatingLetter ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Cover Letter
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeSection === 'overview' ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10"
          >
            {/* Left Column: Score & Charts */}
            <div className="lg:col-span-2 space-y-8">
              {/* Score Card */}
              <div className={`p-10 rounded-[2.5rem] border-2 backdrop-blur-xl ${getScoreBg(analysis.score)} flex flex-col md:flex-row items-center gap-10 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="relative w-48 h-48 flex items-center justify-center filter drop-shadow-2xl">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="96" cy="96" r="84" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/10" />
                    <circle
                      cx="96" cy="96" r="84" stroke={getScoreStroke(analysis.score)} strokeWidth="12" fill="transparent"
                      strokeDasharray={528} strokeDashoffset={528 - (528 * analysis.score) / 100}
                      strokeLinecap="round" className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-6xl font-black ${getScoreColor(analysis.score)} drop-shadow-md`}>{analysis.score}</span>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">{hasJobDesc ? 'ATS Score' : 'Overall Score'}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-5 relative z-10">
                  <h3 className="text-3xl font-black text-white">
                    {hasJobDesc 
                      ? (analysis.score >= 80 ? 'Excellent Match! 🎉' : analysis.score >= 60 ? 'Good Potential ✨' : 'Needs Optimization ⚠️')
                      : (analysis.score >= 80 ? 'Excellent Quality! 🎉' : analysis.score >= 60 ? 'Good Profile ✨' : 'Needs Improvement ⚠️')
                    }
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    {hasJobDesc ? (
                      <>
                        Your resume has a <strong className="text-white">{analysis.score}% match</strong> with the job description.
                        {analysis.score < 80 && " Follow our AI suggestions below to add missing keywords and quantify achievements."}
                      </>
                    ) : (
                      <>
                        Your resume has an overall quality score of <strong className="text-white">{analysis.score}%</strong>.
                        {analysis.score < 80 && " Follow our AI suggestions below to improve formatting, structure, and content impact."}
                      </>
                    )}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-sm font-bold text-white shadow-lg backdrop-blur-md">
                      <Target className="w-5 h-5 text-brand-secondary" />
                      {analysis.breakdown.skillsMatch}% {hasJobDesc ? 'Skills Match' : 'Skill Strength'}
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-sm font-bold text-white shadow-lg backdrop-blur-md">
                      <Sparkles className="w-5 h-5 text-brand-primary" />
                      {analysis.breakdown.keywordDensity}% {hasJobDesc ? 'Keywords' : 'Keyword Density'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="glass-card p-8 rounded-[2.5rem]">
                  <h4 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-brand-primary" />
                    Performance Setup
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={80} style={{ fontSize: '12px', fontWeight: 'bold', fill: '#9ca3af' }} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ background: 'rgba(17,24,39,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.value >= 80 ? '#4ade80' : entry.value >= 60 ? '#fbbf24' : '#f87171'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass-card p-8 rounded-[2.5rem]">
                  <h4 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                    <Brain className="w-6 h-6 text-brand-secondary" />
                    Skill Distribution
                  </h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#9ca3af' }} />
                        <Radar
                          name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 relative overflow-hidden">
                {analysis.tier === 'free' && (
                   <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/60 flex flex-col items-center justify-center p-6 text-center">
                      <Lock className="w-10 h-10 text-white/50 mb-3" />
                      <h4 className="text-white font-bold mb-2">Premium Feature</h4>
                      <p className="text-xs text-gray-400 mb-4">Upgrade to unlock full AI Recommendations</p>
                      <button onClick={handleUpgrade} disabled={upgrading} className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-2">
                        {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Upgrade for $2/mo
                      </button>
                   </div>
                )}
                <h4 className="text-2xl font-black text-white flex items-center gap-3">
                  <Lightbulb className="w-8 h-8 text-amber-400 animate-pulse" />
                  AI Recommendations
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysis.suggestions?.map((suggestion, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 flex gap-4 hover:bg-white/10 transition-colors duration-300">
                      <div className="w-8 h-8 bg-brand-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-brand-primary/30">
                        <span className="text-sm font-black text-brand-primary">{i + 1}</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed font-medium">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Hiring Companies */}
              <div className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden border border-brand-primary/20">
                {analysis.tier === 'free' && (
                   <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/60 flex flex-col items-center justify-center p-6 text-center">
                      <Lock className="w-10 h-10 text-white/50 mb-3" />
                      <h4 className="text-white font-bold mb-2">Premium Feature</h4>
                      <p className="text-xs text-gray-400 mb-4">Upgrade to see top companies hiring for your profile</p>
                      <button onClick={handleUpgrade} disabled={upgrading} className="px-6 py-2 bg-brand-primary hover:bg-brand-secondary text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-2">
                        {upgrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        Upgrade for $2/mo
                      </button>
                   </div>
                )}
                <h4 className="text-2xl font-black text-white flex items-center gap-3 mb-6">
                  <Briefcase className="w-8 h-8 text-brand-primary" />
                  Top Hiring Companies
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {analysis.topCompanies?.map((company, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors duration-300">
                      <h5 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                        {company.url ? (
                          <a href={company.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-primary transition-colors flex items-center gap-2">
                            {company.name}
                            <ExternalLink className="w-4 h-4 text-brand-secondary opacity-70" />
                          </a>
                        ) : (
                          company.name
                        )}
                      </h5>
                      <p className="text-sm text-gray-400 mb-3">{company.description}</p>
                      <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
                        <p className="text-sm text-gray-300">
                          <span className="font-bold text-brand-primary">Why a match: </span>
                          {company.whyMatch}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!analysis.topCompanies || analysis.topCompanies.length === 0) && analysis.tier === 'premium' && (
                    <p className="text-sm text-gray-400 italic">No specific company recommendations available for this profile.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Skills & Weaknesses */}
            <div className="space-y-8 relative">
                {analysis.tier === 'free' && (
                   <div className="absolute inset-0 z-20 backdrop-blur-xl bg-black/60 rounded-[2.5rem] flex flex-col items-center justify-center p-6 text-center border border-white/5">
                      <Lock className="w-12 h-12 text-brand-secondary mb-4 drop-shadow-lg" />
                      <h4 className="text-2xl text-white font-black mb-3">Locked Insights</h4>
                      <p className="text-sm text-gray-300 max-w-xs mb-6">Upgrade your tier to see exactly which skills are missing and what critical weaknesses the ATS flagged.</p>
                      <button onClick={handleUpgrade} disabled={upgrading} className="px-8 py-3 bg-brand-primary hover:bg-brand-secondary text-white font-black uppercase tracking-widest rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.5)] flex items-center gap-3 hover:-translate-y-1 duration-300">
                        {upgrading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
                        Unlock Insights ($2/mo)
                      </button>
                   </div>
                )}
              {/* Missing Skills */}
              <div className="glass-card p-8 rounded-[2.5rem]">
                <h4 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <Award className="w-6 h-6 text-brand-secondary" />
                  {hasJobDesc ? 'Missing Skills' : 'Recommended Skills'}
                </h4>
                <div className="flex flex-wrap gap-3">
                  {analysis.missingSkills?.map((skill, i) => (
                    <span key={i} className="px-4 py-2 bg-red-500/10 text-red-400 text-xs font-black uppercase tracking-wider rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(248,113,113,0.1)]">
                      {skill}
                    </span>
                  ))}
                  {(!analysis.missingSkills || analysis.missingSkills.length === 0) && (
                    <p className="text-sm text-gray-400 italic">No major skills missing!</p>
                  )}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="glass-card p-8 rounded-[2.5rem]">
                <h4 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                  Critical Weaknesses
                </h4>
                <ul className="space-y-4">
                  {analysis.weaknesses?.map((weakness, i) => (
                    <li key={i} className="flex gap-4 text-sm text-gray-300 font-medium leading-relaxed bg-white/5 p-4 rounded-2xl">
                      <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0 shadow-[0_0_10px_#fbbf24]" />
                      {weakness}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Verbs */}
              <div className="bg-gradient-to-br from-brand-primary to-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-brand-primary/20 overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
                <h4 className="text-xl font-black mb-4 flex items-center gap-3 relative z-10">
                  <Sparkles className="w-6 h-6" />
                  Pro Tip: Action Verbs
                </h4>
                <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-6 relative z-10">
                  Replace passive words like "worked on" or "helped with" with strong action verbs:
                </p>
                <div className="grid grid-cols-2 gap-3 relative z-10">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs font-black uppercase tracking-wider text-center border border-white/20">Engineered</div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs font-black uppercase tracking-wider text-center border border-white/20">Spearheaded</div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs font-black uppercase tracking-wider text-center border border-white/20">Implemented</div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 text-xs font-black uppercase tracking-wider text-center border border-white/20">Architected</div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : activeSection === 'optimized' ? (
          <motion.div
            key="optimized"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto relative z-10"
          >
            {analysis.tier === 'free' ? (
               <div className="glass-panel p-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center border border-brand-primary/20 bg-brand-primary/5">
                  <div className="w-24 h-24 bg-brand-primary/20 rounded-full flex items-center justify-center mb-8 border border-brand-primary/30 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                     <Lock className="w-10 h-10 text-brand-primary" />
                  </div>
                  <h3 className="text-4xl font-black text-white mb-4">Deep Rewrite Locked</h3>
                  <p className="text-gray-300 max-w-xl mx-auto leading-relaxed mb-8 font-medium">
                    {hasJobDesc 
                      ? "Your free structural scan is complete. To unlock the fully optimized, keyword-injected rewrite tailored perfectly to your job description, please run a Premium Scan."
                      : "Your free structural scan is complete. To unlock the fully polished and rewritten resume optimized for general professional appeal, please run a Premium Scan."
                    }
                  </p>
                  <button onClick={handleUpgrade} disabled={upgrading} className="px-10 py-4 bg-brand-primary hover:bg-brand-secondary text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center gap-3 hover:-translate-y-1 duration-300">
                     {upgrading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                     Upgrade to Premium ($2/mo)
                  </button>
               </div>
            ) : (
            <div className="glass-panel rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-white">AI-Optimized Content</h3>
                    <p className="text-xs text-brand-secondary uppercase tracking-widest font-bold mt-1">{hasJobDesc ? 'Tailored for this role' : 'Generally Optimized'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopy(analysis.optimizedContent || '')}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowResumeDownloads(!showResumeDownloads)}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl text-sm font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-pointer"
                    >
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      Download
                    </button>
                    {showResumeDownloads && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowResumeDownloads(false)} />
                        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-gray-950 border border-white/10 backdrop-blur-xl shadow-2xl p-2 z-50 flex flex-col gap-1">
                          <button
                            onClick={async () => {
                              setShowResumeDownloads(false);
                              setIsDownloading(true);
                              try {
                                await downloadAsPDF(optResumeRef.current, 'optimized_resume.pdf');
                              } catch (e) {
                                alert("Failed to download PDF");
                              } finally {
                                setIsDownloading(false);
                              }
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <FileText className="w-4 h-4 text-red-400" />
                            PDF Document (.pdf)
                          </button>
                          <button
                            onClick={() => {
                              setShowResumeDownloads(false);
                              downloadAsDoc(optResumeRef.current, 'optimized_resume.doc');
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <FileText className="w-4 h-4 text-blue-400" />
                            Word Document (.doc)
                          </button>
                          <button
                            onClick={() => {
                              setShowResumeDownloads(false);
                              downloadAsTxt(analysis.optimizedContent || '', 'optimized_resume.txt');
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <FileText className="w-4 h-4 text-gray-400" />
                            Plain Text (.txt)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-10 !text-white !prose-invert">
                <div className="bg-gradient-to-r from-brand-secondary/20 to-transparent p-6 rounded-3xl border border-brand-secondary/30 mb-8 flex items-start gap-5">
                  <div className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner">
                    <Brain className="w-6 h-6 text-brand-secondary" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white mb-2">AI Optimization Strategy</h4>
                    <p className="text-sm text-brand-secondary/80 leading-relaxed font-medium">
                      {hasJobDesc ? (
                        <>
                          I've restructured your experience to highlight <strong className="text-white">{analysis.missingSkills?.[0] || 'key requirements'}</strong> and used industry-standard keywords to ensure your resume passes ATS filters with a high score.
                        </>
                      ) : (
                        <>
                          I've restructured your experience to highlight your core strengths, improved overall formatting, and used industry-standard keywords to maximize professional appeal and ATS readability.
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none text-gray-300">
                  <ReactMarkdown>{analysis.optimizedContent || ''}</ReactMarkdown>
                </div>
              </div>
            </div>
            )}
          </motion.div>
        ) : activeSection === 'compare' ? (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full relative z-10"
          >
            {analysis.tier === 'free' ? (
               <div className="glass-panel p-16 rounded-[2.5rem] flex flex-col items-center justify-center text-center border border-brand-primary/20 bg-brand-primary/5">
                  <div className="w-24 h-24 bg-brand-primary/20 rounded-full flex items-center justify-center mb-8 border border-brand-primary/30 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                     <Lock className="w-10 h-10 text-brand-primary" />
                  </div>
                  <h3 className="text-4xl font-black text-white mb-4">Deep Compare Locked</h3>
                  <p className="text-gray-300 max-w-xl mx-auto leading-relaxed mb-8 font-medium">Upgrade to Premium to see a side-by-side comparison of your original resume versus the AI-optimized version.</p>
                  <button onClick={handleUpgrade} disabled={upgrading} className="px-10 py-4 bg-brand-primary hover:bg-brand-secondary text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.5)] flex items-center gap-3 hover:-translate-y-1 duration-300">
                     {upgrading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                     Upgrade to Premium ($2/mo)
                  </button>
               </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Original Resume */}
                <div className="glass-panel rounded-[2.5rem] overflow-hidden flex flex-col h-[800px]">
                  <div className="p-6 border-b border-white/10 bg-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shadow-inner border border-gray-700">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-white">Original Resume</h3>
                      <p className="text-xs text-gray-400 font-medium mt-1">Raw Extracted Text</p>
                    </div>
                  </div>
                  <div className="p-8 overflow-y-auto flex-1 relative z-10 prose prose-invert prose-sm max-w-none text-gray-400">
                    <ReactMarkdown>{analysis.originalContent || "No original content extracted. Please re-upload for full extraction."}</ReactMarkdown>
                  </div>
                </div>

                {/* Optimized Resume */}
                <div className="glass-panel rounded-[2.5rem] overflow-hidden flex flex-col h-[800px] border-brand-primary/30 relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-[80px] pointer-events-none" />
                  <div className="p-6 border-b border-brand-primary/20 bg-brand-primary/10 flex items-center gap-4 relative z-10">
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-white">AI Optimized</h3>
                      <p className="text-xs text-brand-secondary font-bold mt-1">ATS-Ready Rewrite</p>
                    </div>
                  </div>
                  <div className="p-8 overflow-y-auto flex-1 relative z-10 prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{analysis.optimizedContent || ''}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="cover-letter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-4xl mx-auto relative z-10"
          >
            <div className="glass-panel rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-white">Tailored Cover Letter</h3>
                    <p className="text-xs text-brand-secondary uppercase tracking-widest font-bold mt-1">Generated based on your resume</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopy(coverLetter)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowLetterDownloads(!showLetterDownloads)}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl text-sm font-black uppercase tracking-wider hover:opacity-95 transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] cursor-pointer"
                    >
                      {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                      Download
                    </button>
                    {showLetterDownloads && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowLetterDownloads(false)} />
                        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-gray-950 border border-white/10 backdrop-blur-xl shadow-2xl p-2 z-50 flex flex-col gap-1">
                          <button
                            onClick={async () => {
                              setShowLetterDownloads(false);
                              setIsDownloading(true);
                              try {
                                await downloadAsPDF(coverLetterRef.current, 'cover_letter.pdf');
                              } catch (e) {
                                alert("Failed to download PDF");
                              } finally {
                                setIsDownloading(false);
                              }
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <FileText className="w-4 h-4 text-red-400" />
                            PDF Document (.pdf)
                          </button>
                          <button
                            onClick={() => {
                              setShowLetterDownloads(false);
                              downloadAsDoc(coverLetterRef.current, 'cover_letter.doc');
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <FileText className="w-4 h-4 text-blue-400" />
                            Word Document (.doc)
                          </button>
                          <button
                            onClick={() => {
                              setShowLetterDownloads(false);
                              downloadAsTxt(coverLetter, 'cover_letter.txt');
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-xl hover:bg-white/10 text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer border-none bg-transparent"
                          >
                            <FileText className="w-4 h-4 text-gray-400" />
                            Plain Text (.txt)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-10 prose prose-invert max-w-none">
                <div className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed font-medium">
                  {coverLetter}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Off-screen Print-Formatted Containers */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
        <div 
          ref={optResumeRef} 
          className="print-prose bg-white p-12 text-slate-800" 
          style={{ width: '800px', boxSizing: 'border-box' }}
        >
          <ReactMarkdown>{analysis.optimizedContent || ''}</ReactMarkdown>
        </div>
        <div 
          ref={coverLetterRef} 
          className="print-prose bg-white p-12 text-slate-800" 
          style={{ width: '800px', boxSizing: 'border-box' }}
        >
          <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'Arial, sans-serif' }}>
            {coverLetter}
          </div>
        </div>
      </div>
    </div>
  );
}
