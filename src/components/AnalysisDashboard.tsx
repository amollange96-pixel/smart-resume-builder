import React, { useState } from 'react';
import { Resume, AnalysisResult, User } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { 
  CheckCircle2, AlertCircle, Lightbulb, Sparkles, FileText, 
  ChevronRight, Download, Copy, Check, ArrowLeft, Target, 
  Brain, Award, TrendingUp, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface AnalysisDashboardProps {
  resume: Resume | null;
  analysis: AnalysisResult | null;
  user: User;
}

export default function AnalysisDashboard({ resume, analysis, user }: AnalysisDashboardProps) {
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'optimized' | 'cover-letter'>('overview');
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [generatingLetter, setGeneratingLetter] = useState(false);

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
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-2">ATS Score</span>
                  </div>
                </div>

                <div className="flex-1 space-y-5 relative z-10">
                  <h3 className="text-3xl font-black text-white">
                    {analysis.score >= 80 ? 'Excellent Match! 🎉' : analysis.score >= 60 ? 'Good Potential ✨' : 'Needs Optimization ⚠️'}
                  </h3>
                  <p className="text-gray-300 leading-relaxed text-lg">
                    Your resume has a <strong className="text-white">{analysis.score}% match</strong> with the job description. 
                    {analysis.score < 80 && " Follow our AI suggestions below to add missing keywords and quantify achievements."}
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-sm font-bold text-white shadow-lg backdrop-blur-md">
                      <Target className="w-5 h-5 text-brand-secondary" />
                      {analysis.breakdown.skillsMatch}% Skills Match
                    </div>
                    <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-xl border border-white/10 text-sm font-bold text-white shadow-lg backdrop-blur-md">
                      <Sparkles className="w-5 h-5 text-brand-primary" />
                      {analysis.breakdown.keywordDensity}% Keywords
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
              <div className="glass-panel p-8 rounded-[2.5rem] space-y-6">
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
            </div>

            {/* Right Column: Skills & Weaknesses */}
            <div className="space-y-8">
              {/* Missing Skills */}
              <div className="glass-card p-8 rounded-[2.5rem]">
                <h4 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <Award className="w-6 h-6 text-brand-secondary" />
                  Missing Skills
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
            <div className="glass-panel rounded-[2.5rem] overflow-hidden">
              <div className="p-8 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-xl text-white">AI-Optimized Content</h3>
                    <p className="text-xs text-brand-secondary uppercase tracking-widest font-bold mt-1">Tailored for this role</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(analysis.optimizedContent || '')}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
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
                      I've restructured your experience to highlight <strong className="text-white">{analysis.missingSkills?.[0] || 'key requirements'}</strong> and used industry-standard keywords to ensure your resume passes ATS filters with a high score.
                    </p>
                  </div>
                </div>
                <div className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed font-medium">
                  {analysis.optimizedContent}
                </div>
              </div>
            </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(coverLetter)}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-gray-900 rounded-xl text-sm font-black uppercase tracking-wider hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
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
    </div>
  );
}
