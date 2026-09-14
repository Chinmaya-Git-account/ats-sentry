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
  let cursorY = 50;

  // Title / Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ATS OPTIMIZATION DIAGNOSTIC REPORT", margin, cursorY);
  cursorY += 24;

  // Score
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Estimated ATS Match Score: ${result.matchScore}%`, margin, cursorY);
  cursorY += 20;

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 20;

  // Missing Skills
  doc.setFont("helvetica", "bold");
  doc.text("IDENTIFIED KEYWORD & HARD SKILL GAPS:", margin, cursorY);
  cursorY += 16;
  doc.setFont("helvetica", "normal");
  const skillsText = result.missingHardSkills.length > 0 
    ? result.missingHardSkills.join(", ") 
    : "No critical skill gaps identified.";
  const splitSkills = doc.splitTextToSize(skillsText, maxLineWidth);
  doc.text(splitSkills, margin, cursorY);
  cursorY += splitSkills.length * 14 + 16;

  // Suggested Rewrites
  doc.setFont("helvetica", "bold");
  doc.text("RECOMMENDED HIGH-IMPACT BULLET REWRITES:", margin, cursorY);
  cursorY += 16;
  doc.setFont("helvetica", "normal");

  result.suggestedBulletRewrites.forEach((item, idx) => {
    const bullet = `${idx + 1}. ${item.rewrite}`;
    const splitBullet = doc.splitTextToSize(bullet, maxLineWidth);
    
    if (cursorY + splitBullet.length * 14 > 720) {
      doc.addPage();
      cursorY = 50;
    }

    doc.text(splitBullet, margin, cursorY);
    cursorY += splitBullet.length * 14 + 10;
  });

  doc.save("ATS_Optimized_Report.pdf");
}