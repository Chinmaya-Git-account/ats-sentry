// lib/types.ts

export interface JargonReplacement {
  flagged: string;
  replacement: string;
}

export interface BulletRewrite {
  original: string;
  rewrite: string;
}

export interface AnalysisResult {
  matchScore: number;
  missingHardSkills: string[];
  corporateJargonFlags: JargonReplacement[];
  suggestedBulletRewrites: BulletRewrite[];
}

export interface AnalyzeRequest {
  resumeText: string;
  jobDescriptionText: string;
}