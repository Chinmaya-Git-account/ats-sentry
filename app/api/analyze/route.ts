import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient as createAdminSupabase } from "@supabase/supabase-js";
import type { JargonReplacement, BulletRewrite } from "@/lib/types";

export const maxDuration = 60;

// Initialize Supabase Admin client for secure backend database mutations
const adminSupabase = createAdminSupabase(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
  // 1. Authenticate User via Supabase Session
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Please sign in with Google or Email to run an ATS scan." },
      { status: 401 },
    );
  }

  // 2. Validate Request Body
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

  // 3. Atomically Check & Decrement Scan Credit
  const { data: remainingCredits, error: creditError } = await adminSupabase.rpc(
    "decrement_credit",
    { user_id: user.id },
  );

  if (creditError || remainingCredits < 0) {
    return NextResponse.json(
      {
        error: "You have used all your scan credits. Upgrade your scan pack to continue.",
        code: "OUT_OF_CREDITS",
      },
      { status: 402 }, // 402 Payment Required triggers the paywall
    );
  }

  // 4. Run OpenAI Analysis
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
      // Refund the credit if OpenAI fails to return content
      await adminSupabase
        .from("profiles")
        .update({ scan_credits: remainingCredits + 1 })
        .eq("id", user.id);

      return NextResponse.json(
        { error: "OpenAI returned an empty response." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(content) as Record<string, unknown>;

    return NextResponse.json(
      {
        remainingCredits,
        matchScore: asMatchScore(parsed.matchScore),
        missingHardSkills: asStringArray(parsed.missingHardSkills),
        corporateJargonFlags: asJargonReplacements(parsed.corporateJargonFlags),
        recommendations: asRecommendations(parsed.recommendations),
        suggestedBulletRewrites: asBulletRewrites(parsed.suggestedBulletRewrites),
      },
      { status: 200 },
    );
  } catch (error) {
    // Refund the credit if the API throws an unexpected error
    await adminSupabase
      .from("profiles")
      .update({ scan_credits: remainingCredits + 1 })
      .eq("id", user.id);

    const message =
      error instanceof Error ? error.message : "OpenAI analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}