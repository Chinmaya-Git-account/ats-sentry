export type SuggestedRewrite = {
  original: string;
  rewrite: string;
};

export type AnalysisResult = {
  matchScore: number;
  missingHardSkills: string[];
  corporateJargonFlags: string[];
  suggestedBulletRewrites: SuggestedRewrite[];
};

export type AnalyzeRequest = {
  resumeText: string;
  jobDescriptionText: string;
};
