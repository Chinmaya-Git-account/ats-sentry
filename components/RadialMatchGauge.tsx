"use client";

import { useMemo } from "react";

interface RadialMatchGaugeProps {
  score: number; // 0 to 100
  size?: number; // width/height in px
  strokeWidth?: number;
}

export default function RadialMatchGauge({
  score,
  size = 180,
  strokeWidth = 14,
}: RadialMatchGaugeProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // SVG Geometry calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;

  // Visual tones matching The Ghost Engineer / Jobscan spectrum
  const { strokeColor, glowColor, textColor, statusLabel } = useMemo(() => {
    if (normalizedScore >= 75) {
      return {
        strokeColor: "#10b981", // emerald-500
        glowColor: "rgba(16, 185, 129, 0.25)",
        textColor: "text-emerald-400",
        statusLabel: "HIGH ALIGNMENT",
      };
    }
    if (normalizedScore >= 50) {
      return {
        strokeColor: "#f59e0b", // amber-500
        glowColor: "rgba(245, 158, 11, 0.25)",
        textColor: "text-amber-400",
        statusLabel: "MODERATE GAP RISK",
      };
    }
    return {
      strokeColor: "#f43f5e", // rose-500
      glowColor: "rgba(244, 63, 94, 0.25)",
      textColor: "text-rose-400",
      statusLabel: "ATS FILTER RISK",
    };
  }, [normalizedScore]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/70 border border-slate-800/80 rounded-2xl shadow-xl">
      {/* SVG Radial Meter */}
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1e293b" // slate-800
            strokeWidth={strokeWidth}
          />
          {/* Animated Value Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: `drop-shadow(0px 0px 8px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
            MATCH RATE
          </span>
          <span className={`text-4xl font-extrabold tracking-tight tabular-nums ${textColor}`}>
            {normalizedScore}%
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500 mt-0.5">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* The Ghost Truth Disclaimer */}
      <div className="mt-5 max-w-xs text-center border-t border-slate-800/80 pt-3">
        <p className="font-mono text-[10px] text-slate-500 tracking-wider uppercase mb-1">
          // AUDIT REALITY
        </p>
        <p className="text-xs text-slate-400 leading-relaxed italic">
          &ldquo;No software guarantees an interview. This audit measures keyword density and syntax alignment against automated parsers before an engineering lead ever reads it.&rdquo;
        </p>
      </div>
    </div>
  );
}