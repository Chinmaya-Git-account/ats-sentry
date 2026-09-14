import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ratelimit } from "@/lib/ratelimit";

export const maxDuration = 60;

const SYSTEM_PROMPT =
  "You are an ATS compliance scanner and technical recruiter. Analyze the candidate's resume against the target job description. Return a strict JSON object with:\n   - match_score: integer between 0 and 100\n   - missing_hard_skills: string array of technical tools, libraries, or frameworks from the JD missing from the resume\n   - corporate_fluff_flags: string array of passive, unquantified phrases found in the resume\n   - bullet_rewrites: string array of 3 high-impact bullets using the 'Accomplished X by doing Y measured by Z' framework incorporating the missing skills.";

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

export async function POST(request: Request) {
  // 1. Extract IP for rate limiting
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  // 2. Check if the user has scans left
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const { success, remaining, reset } = await ratelimit.limit(ip);

    if (!success) {
      return NextResponse.json(
        { 
          error: `Rate limit reached. You have used your 3 free daily scans. Resets in ${Math.ceil((reset - Date.now()) / (1000 * 60 * 60))} hours.` 
        },
        { status: 429 }
      );
    }
  }
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
    typeof (body as { jobDescriptionText?: unknown }).jobDescriptionText !==
      "string"
  ) {
    return NextResponse.json(
      {
        error:
          "Expected JSON with string fields resumeText and jobDescriptionText.",
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
        matchScore: asMatchScore(parsed.match_score),
        missingHardSkills: asStringArray(parsed.missing_hard_skills),
        corporateJargonFlags: asStringArray(parsed.corporate_fluff_flags),
        suggestedBulletRewrites: asStringArray(parsed.bullet_rewrites).map(
          (rewrite) => ({
            original: "ATS-optimized rewrite",
            rewrite,
          }),
        ),
      },
      { status: 200 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpenAI analysis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
