export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
  role: 'user' | 'admin';
  tier?: 'free' | 'premium';
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  uploadDate: any;
  content: string;
}

export interface AnalysisBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  keywordDensity: number;
  formatting: number;
  grammar: number;
}

export interface CompanyMatch {
  name: string;
  description: string;
  whyMatch: string;
  url?: string;
}

export interface AnalysisResult {
  id: string;
  resumeId: string;
  userId: string;
  jobDescription?: string;
  tier: 'free' | 'premium';
  score: number;
  breakdown: AnalysisBreakdown;
  missingSkills?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  topCompanies?: CompanyMatch[];
  originalContent?: string;
  optimizedContent?: string;
  createdAt: any;
}
