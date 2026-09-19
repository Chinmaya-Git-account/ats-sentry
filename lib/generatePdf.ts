// lib/generatePdf.ts
import { jsPDF } from "jspdf";
import type { AnalysisResult } from "@/lib/types";

export function exportAtsPdf(resumeText: string, result: AnalysisResult) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxLineWidth = pageWidth - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottomThreshold = pageHeight - 60;
  let cursorY = 50;

  function checkPageBreak(requiredSpace: number) {
    if (cursorY + requiredSpace > bottomThreshold) {
      doc.addPage();
      cursorY = 50;
    }
  }

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("ATS OPTIMIZATION DIAGNOSTIC REPORT", margin, cursorY);
  cursorY += 22;

  // Score
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Estimated ATS Match Score: ${result.matchScore}%`, margin, cursorY);
  cursorY += 16;

  // Line separator
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 20;

  // 1. Missing Skills
  checkPageBreak(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("IDENTIFIED KEYWORD & HARD SKILL GAPS:", margin, cursorY);
  cursorY += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const skillsText =
    result.missingHardSkills && result.missingHardSkills.length > 0
      ? result.missingHardSkills.join(", ")
      : "No critical skill gaps identified against this description.";
  const splitSkills = doc.splitTextToSize(skillsText, maxLineWidth);
  checkPageBreak(splitSkills.length * 13 + 10);
  doc.text(splitSkills, margin, cursorY);
  cursorY += splitSkills.length * 13 + 18;

  // 2. Corporate Jargon Flags & Replacements
  if (result.corporateJargonFlags && result.corporateJargonFlags.length > 0) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`CORPORATE JARGON FLAGS & REPLACEMENTS (${result.corporateJargonFlags.length}):`, margin, cursorY);
    cursorY += 16;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    result.corporateJargonFlags.forEach((item) => {
      const line = `* "${item.flagged}" -> Replace with: "${item.replacement}"`;
      const splitLine = doc.splitTextToSize(line, maxLineWidth);
      checkPageBreak(splitLine.length * 13 + 6);
      doc.text(splitLine, margin, cursorY);
      cursorY += splitLine.length * 13 + 6;
    });
    cursorY += 12;
  }

  // 3. Actionable Recruiter & ATS Recommendations (NEW SECTION)
  if (result.recommendations && result.recommendations.length > 0) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`ACTIONABLE RECRUITER & ATS RECOMMENDATIONS (${result.recommendations.length}):`, margin, cursorY);
    cursorY += 16;

    result.recommendations.forEach((rec) => {
      checkPageBreak(35);
      
      // Priority Tag styling
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      if (rec.priority === "HIGH") {
        doc.setTextColor(185, 28, 28); // rose-700
      } else if (rec.priority === "MEDIUM") {
        doc.setTextColor(217, 119, 6); // amber-600
      } else {
        doc.setTextColor(71, 85, 105); // slate-600
      }

      const headerLine = `[${rec.priority}] ${rec.category}:`;
      doc.text(headerLine, margin, cursorY);
      cursorY += 12;

      // Action Instruction
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      const splitAction = doc.splitTextToSize(rec.action, maxLineWidth);
      checkPageBreak(splitAction.length * 13 + 8);
      doc.text(splitAction, margin, cursorY);
      cursorY += splitAction.length * 13 + 8;
    });
    cursorY += 12;
  }

  // 4. Suggested Bullet Rewrites (XYZ Formula)
  if (result.suggestedBulletRewrites && result.suggestedBulletRewrites.length > 0) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("RECOMMENDED HIGH-IMPACT BULLET REWRITES (XYZ FORMULA):", margin, cursorY);
    cursorY += 16;

    result.suggestedBulletRewrites.forEach((item, idx) => {
      // Original bullet block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(185, 28, 28); // rose-700
      checkPageBreak(30);
      doc.text(`[Bullet ${idx + 1}] Original:`, margin, cursorY);
      cursorY += 12;

      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      const splitOriginal = doc.splitTextToSize(`"${item.original}"`, maxLineWidth);
      checkPageBreak(splitOriginal.length * 12 + 10);
      doc.text(splitOriginal, margin, cursorY);
      cursorY += splitOriginal.length * 12 + 8;

      // Rewritten bullet block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(2, 132, 199); // sky-600
      checkPageBreak(25);
      doc.text("ATS Rewrite:", margin, cursorY);
      cursorY += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const splitRewrite = doc.splitTextToSize(item.rewrite, maxLineWidth);
      checkPageBreak(splitRewrite.length * 13 + 14);
      doc.text(splitRewrite, margin, cursorY);
      cursorY += splitRewrite.length * 13 + 14;
    });
  }

  doc.save("ATS_Optimized_Report.pdf");
}