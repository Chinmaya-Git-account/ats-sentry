import type { AnalysisResult, SuggestedRewrite } from "./types";

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

const JARGON_PATTERNS: { phrase: string; flag: string }[] = [
  {
    phrase: "synerg",
    flag: "“Synergy” language — replace with a concrete collaboration outcome.",
  },
  {
    phrase: "leverage",
    flag: "“Leverage” is vague — name the tool, process, or data you actually used.",
  },
  {
    phrase: "circle back",
    flag: "“Circle back” is filler — describe the decision or follow-up you owned.",
  },
  {
    phrase: "thought leadership",
    flag: "“Thought leadership” is unmeasurable — cite talks, docs, or adoption.",
  },
  {
    phrase: "best of breed",
    flag: "“Best-of-breed” is marketing speak — specify the stack or vendor.",
  },
  {
    phrase: "move the needle",
    flag: "“Move the needle” — quantify the metric that actually changed.",
  },
  {
    phrase: "low hanging fruit",
    flag: "“Low-hanging fruit” — name the quick win and its impact.",
  },
  {
    phrase: "paradigm",
    flag: "“Paradigm” rarely survives ATS parsing — use the actual method or model.",
  },
  {
    phrase: "holistic",
    flag: "“Holistic” is empty — list the systems or stakeholders you covered.",
  },
  {
    phrase: "robust",
    flag: "“Robust” is a filler adjective — describe reliability, scale, or tests.",
  },
  {
    phrase: "proactive",
    flag: "“Proactive” is weak — show the initiative and the result.",
  },
  {
    phrase: "results-driven",
    flag: "“Results-driven” is a cliché — lead with the result instead.",
  },
  {
    phrase: "dynamic",
    flag: "“Dynamic” adds no signal — drop it or replace with a specific trait.",
  },
  {
    phrase: "go-getter",
    flag: "“Go-getter” is informal fluff — ATS and recruiters both skip it.",
  },
  {
    phrase: "team player",
    flag: "“Team player” is generic — describe cross-functional work you shipped.",
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
  const corporateJargonFlags = JARGON_PATTERNS.filter(({ phrase }) =>
    resumeNorm.includes(phrase),
  ).map(({ flag }) => flag);

  const bullets = extractBullets(resumeText);
  const suggestedBulletRewrites: SuggestedRewrite[] = bullets
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
