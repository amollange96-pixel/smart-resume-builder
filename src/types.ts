export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: any;
  role: 'user' | 'admin';
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

export interface AnalysisResult {
  id: string;
  resumeId: string;
  userId: string;
  jobDescription?: string;
  score: number;
  breakdown: AnalysisBreakdown;
  missingSkills?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  optimizedContent?: string;
  createdAt: any;
}
