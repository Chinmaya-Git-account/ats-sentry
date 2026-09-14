"use client";

import { useMemo, useState, useRef } from "react";
import type { AnalysisResult } from "@/lib/types";
import { extractTextFromFile } from "@/lib/extractText";
import { exportAtsPdf } from "@/lib/generatePdf";

function FileUploadButton({
  label,
  onTextExtracted,
}: {
  label: string;
  onTextExtracted: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFileName(file.name);
    try {
      const extracted = await extractTextFromFile(file);
      onTextExtracted(extracted);
    } catch (err: any) {
      alert(err.message || "Failed to parse file.");
      setFileName(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
      >
        {loading ? "Parsing..." : label}
      </button>
      {fileName && (
        <span className="text-xs text-emerald-400 truncate max-w-[140px]">
          ✓ {fileName}
        </span>
      )}
    </div>
  );
}

function scoreTone(score: number) {
  if (score >= 75) {
    return "border-emerald-400/40 bg-emerald-500/15 text-emerald-200";
  }
  if (score >= 50) {
    return "border-amber-400/40 bg-amber-500/15 text-amber-200";
  }
  return "border-rose-400/40 bg-rose-500/15 text-rose-200";
}

function skillTone(index: number) {
  return index % 2 === 0
    ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
    : "border-amber-400/30 bg-amber-500/10 text-amber-200";
}

export default function Analyzer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const canSubmit = useMemo(
    () => resumeText.trim().length > 0 && jobDescriptionText.trim().length > 0,
    [resumeText, jobDescriptionText],
  );

  async function runAnalysis() {
    if (!canSubmit || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescriptionText }),
      });

      const payload = (await response.json()) as
        | AnalysisResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Analysis failed. Try again.",
        );
      }

      setResult(payload as AnalysisResult);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function fallbackCopy(text: string) {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    if (!ok) {
      throw new Error("Copy execution failed");
    }
  }

  async function copyRewrite(text: string, index: number) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        fallbackCopy(text);
      }
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      try {
        fallbackCopy(text);
        setCopiedIndex(index);
        window.setTimeout(() => setCopiedIndex(null), 1600);
      } catch {
        setCopiedIndex(-1);
        window.setTimeout(() => setCopiedIndex(null), 1600);
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Resume Column */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-wide text-slate-100">
                Resume Text
              </span>
              <FileUploadButton
                label="Upload (.pdf / .txt)"
                onTextExtracted={(text) => setResumeText(text)}
              />
            </div>
            <span className="font-mono text-xs text-slate-400">
              {resumeText.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your resume here or upload a file — skills, tools, and experience bullets work best for ATS matching."
            className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          />
        </div>

        {/* Job Description Column */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-700/80 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold tracking-wide text-slate-100">
                Job Description
              </span>
              <FileUploadButton
                label="Upload (.pdf / .txt)"
                onTextExtracted={(text) => setJobDescriptionText(text)}
              />
            </div>
            <span className="font-mono text-xs text-slate-400">
              {jobDescriptionText.length.toLocaleString()} chars
            </span>
          </div>
          <textarea
            value={jobDescriptionText}
            onChange={(event) => setJobDescriptionText(event.target.value)}
            placeholder="Paste the target job description or upload a file, including required skills and qualifications."
            className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm leading-6 text-slate-100 placeholder:text-slate-500 focus:border-sky-400/70 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={runAnalysis}
          disabled={!canSubmit || loading}
          className="inline-flex min-w-64 items-center justify-center gap-3 rounded-full bg-sky-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-950/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {loading ? (
            <>
              <span
                aria-hidden
                className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              />
              Analyzing…
            </>
          ) : (
            "Run ATS Analysis"
          )}
        </button>
        {!canSubmit && (
          <p className="text-xs text-slate-500">
            Provide both a resume and a job description to run analysis.
          </p>
        )}
        {error && (
          <p className="text-sm text-rose-300" role="alert">
            {error}
          </p>
        )}
      </div>

      {result && (
        <section className="flex flex-col gap-6 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Pre-flight results
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Keyword coverage, gap skills, and rewrite suggestions for ATS
                parsers.
              </p>
            </div>

            {/* Action Zone: Score & Download Button */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => exportAtsPdf(resumeText, result)}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
              >
                📥 Download PDF Report
              </button>

              <div
                className={`rounded-2xl border px-5 py-3 text-center ${scoreTone(result.matchScore)}`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">
                  Match score
                </p>
                <p className="mt-1 text-4xl font-bold tabular-nums">
                  {result.matchScore}%
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Missing hard skills
            </h3>
            {result.missingHardSkills.length === 0 ? (
              <p className="text-sm text-slate-400">
                No obvious hard-skill gaps against this description.
              </p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {result.missingHardSkills.map((skill, index) => (
                  <li
                    key={`${skill}-${index}`}
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${skillTone(index)}`}
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Corporate Jargon Flags & Replacements
            </h3>
            {result.corporateJargonFlags.length === 0 ? (
              <p className="text-sm text-slate-400">
                No corporate filler detected in the resume.
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-200">
                {result.corporateJargonFlags.map((item, idx) => (
                  <li key={`${item.flagged}-${idx}`} className="flex flex-wrap items-center gap-2">
                    <span className="line-through text-rose-400 font-mono">
                      {item.flagged}
                    </span>
                    <span className="text-slate-500">→ replace with:</span>
                    <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {item.replacement}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-300">
              Suggested bullet rewrites
            </h3>
            {result.suggestedBulletRewrites.length === 0 ? (
              <p className="text-sm text-slate-400">
                No rewrite suggestions for this resume.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {result.suggestedBulletRewrites.map((item, index) => (
                  <li
                    key={`${item.original}-${index}`}
                    className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-rose-400/80 font-semibold">
                      Original Bullet in Resume
                    </p>
                    <p className="mt-1 text-sm text-slate-300 italic border-l-2 border-slate-700 pl-3">
                      "{item.original}"
                    </p>

                    <p className="mt-3 text-xs uppercase tracking-wide text-sky-400/80 font-semibold">
                      ATS-Optimized Rewrite
                    </p>
                    <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-sm leading-6 text-slate-100 font-medium">
                        {item.rewrite}
                      </p>
                      <button
                        type="button"
                        onClick={() => copyRewrite(item.rewrite, index)}
                        className="shrink-0 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-sky-400/50 hover:bg-slate-700"
                      >
                        {copiedIndex === index
                          ? "Copied"
                          : copiedIndex === -1
                            ? "Copy failed"
                            : "Copy"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}