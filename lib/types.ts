// lib/types.ts

export interface JargonReplacement {
  flagged: string;
  replacement: string;
}

export interface BulletRewrite {
  original: string;
  rewrite: string;
}

export interface AuditRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  action: string;
}

export interface AnalysisResult {
  matchScore: number;
  missingHardSkills: string[];
  corporateJargonFlags: JargonReplacement[];
  recommendations: AuditRecommendation[];
  suggestedBulletRewrites: BulletRewrite[];
}