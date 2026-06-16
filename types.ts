// src/types.ts

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  role: "user" | "admin";
  tier?: "free" | "premium";
}

export interface Resume {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  uploadDate: string;
  content: string;
}

export interface ScoreBreakdown {
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
  breakdown: ScoreBreakdown;
  missingSkills?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  originalContent?: string;
  optimizedContent?: string;
  topCompanies?: string[];
  tier?: "free" | "premium";
  createdAt: string;
}
