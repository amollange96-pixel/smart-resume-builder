import React, { useState, useRef } from 'react';
import { Sparkles, Loader2, Copy, Check, Download, FileText, Send, User as UserIcon, Target } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { User } from '../types';
import { generateResume } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import html2pdf from 'html2pdf.js';

interface ResumeGeneratorProps {
  user: User;
}

export default function ResumeGenerator({ user }: ResumeGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatedResume, setGeneratedResume] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    fullName: user.displayName || '',
    email: user.email || '',
    phone: '',
    location: '',
    targetRole: '',
    experience: '',
    skills: '',
    education: '',
  });

  // --- 3D Parallax Mouse Tracking ---
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 100, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["3deg", "-3deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-3deg", "3deg"]);
  const shadowX = useTransform(mouseXSpring, [-0.5, 0.5], [10, -10]);
  const shadowY = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };
  // ----------------------------------

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const prompt = `
        Generate a professional resume for the following person:
        Name: ${formData.fullName}
        Email: ${formData.email}
        Phone: ${formData.phone}
        Location: ${formData.location}
        Target Role: ${formData.targetRole}
        
        Experience:
        ${formData.experience}
        
        Skills:
        ${formData.skills}
        
        Education:
        ${formData.education}
        
        Format the resume in extremely clean, standard Markdown optimized for parsing.
        CRITICAL RULES:
        1. No placeholder text. Output ONLY the final resume.
        2. Do NOT use horizontal rules (---).
        3. Use powerful action verbs and professional language.
        4. Follow the exact Markdown heading sizes listed below.

        Here is the explicit structure you MUST follow:

        # ${formData.fullName}
        **${formData.email} | ${formData.phone} | ${formData.location}**
        *(Optional: target role ${formData.targetRole})*

        ## PROFESSIONAL SUMMARY
        (Write a 3-4 sentence professional summary highlighting their top strengths and targeting their role based on the inputs)

        ## CORE COMPETENCIES & SKILLS
        (Provide a clean comma-separated list or short categorizations of their skills based on the inputs)

        ## EXPERIENCE
        (For each position mentioned in their history, format exactly like this):
        ### [Target/Extracted Role Title] - [Company Name]
        *(Format the dates clearly if possible, else omit)*
        - (Action-driven bullet point 1 detailing achievements)
        - (Action-driven bullet point 2)
        - (Action-driven bullet point 3)

        (Use the input experience to build these bullet points):
        User Input History: ${formData.experience}

        ## EDUCATION
        (Format their education history clearly, similar to experience):
        ### [Degree / Certificate] - [Institution]
        
        User Input Education: ${formData.education}
      `;
      
      const resume = await generateResume(prompt);
      setGeneratedResume(resume);
      setGenerateError(null);
    } catch (error: any) {
      console.error('Error generating resume:', error);
      setGenerateError(error.message || "Failed to generate resume. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!resumeRef.current || !generatedResume) return;
    setDownloading(true);
    
    try {
      const element = resumeRef.current;
      
      // Temporarily override styles for PDF printing to make it look perfect
      const options = {
        margin: 15,
        filename: `${formData.fullName.replace(/\s+/g, '_')}_Resume.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      // Add a temporary class to format it for dark/light pdf translation if needed
      // Currently HTML2PDF renders exactly what is visible, so we let ReactMarkdown style it via standard prose
      await html2pdf().from(element).set(options).save();

    } catch (error) {
      console.error("PDF Generation Error", error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      <div className="text-center space-y-4 relative z-10">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-white tracking-tight">AI Resume Generator</h1>
        <p className="text-gray-400 text-lg font-medium max-w-2xl mx-auto leading-relaxed">Experience our crazy 3D interface. Fill in your details below and watch our AI dynamically compile a stunning resume.</p>
      </div>

      <div 
        className="w-full relative py-12"
        style={{ perspective: 1500 }}
      >
        {/* Background ambient lighting that shifts with the 3D tilt */}
        <motion.div 
          className="absolute inset-0 bg-brand-primary/10 rounded-[3rem] blur-[100px] pointer-events-none -z-10"
          style={{ x: shadowX, y: shadowY }}
        />

        <motion.div 
          className="grid grid-cols-1 xl:grid-cols-2 gap-10"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Input Form Card */}
          <div 
            className="glass-panel p-10 rounded-[2.5rem] relative overflow-hidden backdrop-blur-2xl shadow-2xl"
            style={{ transform: "translateZ(10px)" }} // Lessened Z POP
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/10 rounded-full blur-[80px] pointer-events-none" />
            <form onSubmit={handleGenerate} className="space-y-6 relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Your Information</h3>
                  <p className="text-xs text-gray-400">Basic details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-secondary uppercase tracking-wider">Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/30 outline-none transition-all text-white placeholder:text-gray-600" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-brand-secondary uppercase tracking-wider">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-brand-secondary/50 focus:ring-1 focus:ring-brand-secondary/30 outline-none transition-all text-white placeholder:text-gray-600" placeholder="john@example.com" required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Phone</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-white/30 outline-none transition-all text-white placeholder:text-gray-600" placeholder="+1 (555) 000-0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Location</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-5 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-white/30 outline-none transition-all text-white placeholder:text-gray-600" placeholder="New York, NY" />
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <label className="text-xs font-black text-brand-primary uppercase tracking-wider flex items-center gap-2">
                   <Target className="w-3 h-3" /> Target Career Role
                </label>
                <input type="text" name="targetRole" value={formData.targetRole} onChange={handleInputChange} className="w-full px-5 py-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/20 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all text-white placeholder:text-gray-500 font-bold text-lg" placeholder="Senior Architect, Product Manager, etc." required />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Experience History</label>
                <textarea name="experience" value={formData.experience} onChange={handleInputChange} rows={5} className="w-full px-5 py-4 rounded-2xl bg-black/40 border border-white/10 focus:border-brand-secondary/50 outline-none transition-all resize-none text-white placeholder:text-gray-600 leading-relaxed" placeholder="Describe your work history, roles, and key achievements..." required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Skills</label>
                  <textarea name="skills" value={formData.skills} onChange={handleInputChange} rows={4} className="w-full px-5 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-brand-secondary/50 outline-none transition-all resize-none text-white placeholder:text-gray-600 leading-relaxed" placeholder="React, Node.js, Leadership..." required />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Education</label>
                  <textarea name="education" value={formData.education} onChange={handleInputChange} rows={4} className="w-full px-5 py-3 rounded-2xl bg-black/40 border border-white/10 focus:border-brand-secondary/50 outline-none transition-all resize-none text-white placeholder:text-gray-600 leading-relaxed" placeholder="Degrees, institutions..." required />
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full py-5 bg-gradient-to-r from-brand-primary to-indigo-600 hover:from-brand-primary hover:to-indigo-500 text-white font-black uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:shadow-none hover:-translate-y-1">
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating Magic...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Craft My Resume
                  </>
                )}
              </button>
              {generateError && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-bold text-center">
                  {generateError}
                </div>
              )}
            </form>
          </div>

          {/* Output Preview Card */}
          <div 
            className="glass-card p-1 rounded-[2.5rem] relative overflow-hidden backdrop-blur-2xl shadow-xl flex flex-col h-full bg-black/40 border border-white/10"
            style={{ transform: "translateZ(20px)" }} // Lessened Z POP
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none" />
            
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 rounded-t-[2.4rem] relative z-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-white">Live Preview</h3>
                  <p className="text-xs text-green-400 uppercase tracking-widest font-bold mt-1">Ready for PDF</p>
                </div>
              </div>
              
              {/* Action Buttons for Generated Content */}
              {generatedResume && (
                <div className="flex items-center gap-2">
                  <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-bold text-white transition-all">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <button onClick={handleDownloadPDF} disabled={downloading} className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary border border-brand-primary rounded-xl text-sm font-bold text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.5)]">
                    {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download PDF
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto relative z-10 custom-scrollbar">
              <AnimatePresence mode="wait">
                {generatedResume ? (
                  <motion.div
                    key="resume"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    {/* The Hidden/Visible printable block */}
                    {/* Render standard prose. Background is white inside this specific container so it prints properly to high-contrast PDF if generated! */}
                    <div ref={resumeRef} className="bg-white rounded-2xl p-8 sm:p-12 text-black shadow-inner min-h-[700px]">
                      <div className="print-prose max-w-none">
                        <ReactMarkdown>
                          {generatedResume}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-gray-500 text-center"
                  >
                    <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5">
                      <Sparkles className="w-12 h-12 opacity-30 text-brand-secondary" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-300 mb-2">Awaiting Instructions</h4>
                    <p className="max-w-xs leading-relaxed">Your meticulously crafted, AI-generated professional resume will appear in this window.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
