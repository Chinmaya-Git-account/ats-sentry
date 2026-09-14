import type { AnalysisResult, BulletRewrite, JargonReplacement } from "./types";

const HARD_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "SQL",
  "NoSQL",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "React",
  "Next.js",
  "Node.js",
  "Vue",
  "Angular",
  "Django",
  "Flask",
  "FastAPI",
  "Spring",
  "AWS",
  "Azure",
  "GCP",
  "Docker",
  "Kubernetes",
  "Terraform",
  "CI/CD",
  "Git",
  "GraphQL",
  "REST",
  "Kafka",
  "Spark",
  "Hadoop",
  "Pandas",
  "NumPy",
  "TensorFlow",
  "PyTorch",
  "scikit-learn",
  "LLM",
  "NLP",
  "Machine Learning",
  "Data Analysis",
  "Excel",
  "Tableau",
  "Power BI",
  "Salesforce",
  "Jira",
  "Linux",
  "Bash",
  "HTML",
  "CSS",
  "Tailwind",
  "Figma",
  "A/B Testing",
  "SEO",
  "Snowflake",
  "BigQuery",
  "Airflow",
];

const JARGON_PATTERNS: { phrase: string; flagged: string; replacement: string }[] = [
  {
    phrase: "synerg",
    flagged: "Synergy / Synergize",
    replacement: "Collaborated on cross-functional initiatives",
  },
  {
    phrase: "leverage",
    flagged: "Leveraged",
    replacement: "Implemented / Built using",
  },
  {
    phrase: "circle back",
    flagged: "Circle back",
    replacement: "Resolved directly / Followed up",
  },
  {
    phrase: "thought leadership",
    flagged: "Thought leadership",
    replacement: "Published architecture specs / Mentored team",
  },
  {
    phrase: "best of breed",
    flagged: "Best-of-breed",
    replacement: "Industry-standard / Benchmarked stack",
  },
  {
    phrase: "move the needle",
    flagged: "Move the needle",
    replacement: "Improved key metric by X%",
  },
  {
    phrase: "low hanging fruit",
    flagged: "Low-hanging fruit",
    replacement: "Quick optimization / High-impact quick win",
  },
  {
    phrase: "paradigm",
    flagged: "Paradigm",
    replacement: "Framework / Architectural pattern",
  },
  {
    phrase: "holistic",
    flagged: "Holistic approach",
    replacement: "End-to-end implementation",
  },
  {
    phrase: "robust",
    flagged: "Robust",
    replacement: "Fault-tolerant / Scalable",
  },
  {
    phrase: "proactive",
    flagged: "Proactive",
    replacement: "Automated / Anticipated and mitigated",
  },
  {
    phrase: "results-driven",
    flagged: "Results-driven",
    replacement: "Quantified impact (increased throughput by X%)",
  },
  {
    phrase: "dynamic",
    flagged: "Dynamic",
    replacement: "Adaptive / Modular",
  },
  {
    phrase: "go-getter",
    flagged: "Go-getter",
    replacement: "Spearheaded / Initiated",
  },
  {
    phrase: "team player",
    flagged: "Team player",
    replacement: "Partnered across engineering and product teams",
  },
];

function normalize(text: string) {
  return text.toLowerCase();
}

function extractSkills(text: string) {
  const haystack = normalize(text);
  return HARD_SKILLS.filter((skill) => {
    const needle = skill.toLowerCase();
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![a-z0-9+#])${escaped}(?![a-z0-9+#])`, "i");
    return pattern.test(haystack);
  });
}

function extractBullets(resumeText: string) {
  return resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 24)
    .filter((line) => /^[-•*·]/.test(line) || line.split(" ").length >= 8)
    .map((line) => line.replace(/^[-•*·]\s*/, ""))
    .slice(0, 8);
}

function rewriteBullet(original: string): string {
  let rewrite = original.replace(/^[-•*·]\s*/, "").trim();

  rewrite = rewrite
    .replace(/^team player who\s+/i, "")
    .replace(/\bleveraged\s+/gi, "Used ")
    .replace(/\bleverage\s+/gi, "used ")
    .replace(/\bsynergiz(?:ed|e)\s+/gi, "Collaborated on ")
    .replace(/\bhelped to\s+/gi, "")
    .replace(/\bresponsible for\s+/gi, "Owned ")
    .replace(/\brobust\s+/gi, "")
    .replace(/\bproactively\s+/gi, "")
    .replace(/\bvarious\s+/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const startsStrong =
    /^(led|built|owned|shipped|designed|reduced|increased|automated|launched|migrated|implemented|used|delivered|collaborated)/i.test(
      rewrite,
    );
  if (!startsStrong) {
    rewrite = `Delivered ${rewrite.charAt(0).toLowerCase()}${rewrite.slice(1)}`;
  }

  rewrite = rewrite.charAt(0).toUpperCase() + rewrite.slice(1);

  if (!/\d/.test(rewrite)) {
    rewrite = `${rewrite.replace(/\.$/, "")} — add a metric (%, time saved, volume, or $ impact)`;
  }

  if (!rewrite.endsWith(".")) {
    rewrite += ".";
  }

  return rewrite;
}

export function analyzeResume(
  resumeText: string,
  jobDescriptionText: string,
): AnalysisResult {
  const jdSkills = extractSkills(jobDescriptionText);
  const resumeSkills = new Set(extractSkills(resumeText));

  const missingHardSkills = jdSkills.filter((skill) => !resumeSkills.has(skill));
  const matchedCount = jdSkills.filter((skill) => resumeSkills.has(skill)).length;
  const matchScore =
    jdSkills.length === 0
      ? resumeText.trim() && jobDescriptionText.trim()
        ? 55
        : 0
      : Math.round((matchedCount / jdSkills.length) * 100);

  const resumeNorm = normalize(resumeText);
  const corporateJargonFlags: JargonReplacement[] = JARGON_PATTERNS.filter(({ phrase }) =>
    resumeNorm.includes(phrase),
  ).map(({ flagged, replacement }) => ({
    flagged,
    replacement,
  }));

  const bullets = extractBullets(resumeText);
  const suggestedBulletRewrites: BulletRewrite[] = bullets
    .map((original) => ({ original, rewrite: rewriteBullet(original) }))
    .filter(({ original, rewrite }) => original.replace(/^[-•*·]\s*/, "") !== rewrite)
    .slice(0, 5);

  if (suggestedBulletRewrites.length === 0 && resumeText.trim()) {
    suggestedBulletRewrites.push({
      original: "Experience described without quantified outcomes.",
      rewrite:
        "Led [project] using [stack from the JD], shipping [deliverable] that improved [metric] by [X%].",
    });
  }

  return {
    matchScore,
    missingHardSkills,
    corporateJargonFlags,
    suggestedBulletRewrites,
  };
}