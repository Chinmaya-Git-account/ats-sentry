import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";
import type { JargonReplacement, BulletRewrite } from "@/lib/types";

export const maxDuration = 60;

export interface AuditRecommendation {
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  action: string;
}

const SYSTEM_PROMPT = `
You are an uncompromising, high-status engineering hiring manager and ATS auditor.
Analyze the submitted resume against the job description.

STRICT RULES FOR OUTPUT:
1. matchScore: Integer 0-100 reflecting keyword, skills, and responsibility alignment.
2. missingHardSkills: Array of critical technical tools, frameworks, methodologies, libraries, or certifications from the JD missing from the resume.
3. corporateJargonFlags: Array of objects. Find and extract ALL passive, unmeasurable corporate filler, buzzwords, or weak corporate clichés found in the resume (e.g., "team player", "synergized", "handled", "worked on", "results-driven", "proven track record"). 
   Do NOT cap or limit this array. Return EVERY instance found with a high-impact, active replacement verb.
   Format: [{ "flagged": "Proven expertise", "replacement": "Architected / Engineered" }]
4. recommendations: Array of objects. Provide a comprehensive, prioritized list of all actionable structural, technical, and tactical recommendations needed to pass strict ATS parsers and senior recruiter screening.
   Format: [{ "priority": "HIGH" | "MEDIUM" | "LOW", "category": "Keyword Density" | "Impact Metrics" | "Formatting" | "Scope Deficit", "action": "Specific instruction" }]
5. suggestedBulletRewrites: Array of 3 to 5 objects.
   - "original": You MUST find and copy a VERBATIM sentence directly from the user's resume text that is weak, passive, or missing quantifiable metrics. DO NOT invent or summarize text. Copy the literal line from their experience section.
   - "rewrite": Rewrite THAT SPECIFIC line using the Google XYZ Impact formula ("Accomplished [X], as measured by [Y], by doing [Z]").

Return ONLY valid JSON matching this schema:
{
  "matchScore": number,
  "missingHardSkills": string[],
  "corporateJargonFlags": [
    { "flagged": string, "replacement": string }
  ],
  "recommendations": [
    { "priority": "HIGH" | "MEDIUM" | "LOW", "category": string, "action": string }
  ],
  "suggestedBulletRewrites": [
    { "original": string, "rewrite": string }
  ]
}
`;

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function asMatchScore(value: unknown): number {
  const score = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function asJargonReplacements(value: unknown): JargonReplacement[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is { flagged: string; replacement: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as any).flagged === "string" &&
        typeof (item as any).replacement === "string",
    )
    .map((item) => ({
      flagged: item.flagged,
      replacement: item.replacement,
    }));
}

function asRecommendations(value: unknown): AuditRecommendation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(
      (item): item is { priority: "HIGH" | "MEDIUM" | "LOW"; category: string; action: string } =>
        typeof item === "object" &&
        item !== null &&
        ["HIGH", "MEDIUM", "LOW"].includes((item as any).priority) &&
        typeof (item as any).category === "string" &&
        typeof (item as any).action === "string",
    )
    .map((item) => ({
      priority: item.priority,
      category: item.category,
      action: item.action,
    }));
}

function asBulletRewrites(value: unknown): BulletRewrite[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { original: string; rewrite: string } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as any).original === "string" &&
        typeof (item as any).rewrite === "string",
    )
    .map((item) => ({
      original: item.original,
      rewrite: item.rewrite,
    }));
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  /* TEMPORARILY DISABLED FOR TESTING

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { success, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        {
          error: `Rate limit reached. You have used your 3 free daily scans. Resets in ${Math.ceil(
            (reset - Date.now()) / (1000 * 60 * 60),
          )} hours.`,
        },
        { status: 429 },
      );
    }
  }
    */

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { resumeText?: unknown }).resumeText !== "string" ||
    typeof (body as { jobDescriptionText?: unknown }).jobDescriptionText !== "string"
  ) {
    return NextResponse.json(
      {
        error: "Expected JSON with string fields resumeText and jobDescriptionText.",
      },
      { status: 400 },
    );
  }

  const { resumeText, jobDescriptionText } = body as {
    resumeText: string;
    jobDescriptionText: string;
  };

  if (!resumeText.trim() || !jobDescriptionText.trim()) {
    return NextResponse.json(
      { error: "Both resume text and job description are required." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescriptionText}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;

    return NextResponse.json(
      {
        matchScore: asMatchScore(parsed.matchScore),
        missingHardSkills: asStringArray(parsed.missingHardSkills),
        corporateJargonFlags: asJargonReplacements(parsed.corporateJargonFlags),
        recommendations: asRecommendations(parsed.recommendations),
        suggestedBulletRewrites: asBulletRewrites(parsed.suggestedBulletRewrites),
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}