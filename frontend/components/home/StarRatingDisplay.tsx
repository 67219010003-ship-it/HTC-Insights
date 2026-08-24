"use client";

import React from "react";

interface StarRatingDisplayProps {
  score: number;
  maxScore?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showScoreText?: boolean;
  scoreTextClass?: string;
  totalReviews?: number;
}

export default function StarRatingDisplay({
  score,
  maxScore = 5,
  size = "md",
  showScoreText = true,
  scoreTextClass = "font-bold text-primary",
  totalReviews,
}: StarRatingDisplayProps) {
  const clampedScore = Math.min(Math.max(score, 0), maxScore);

  const starSizes = {
    sm: "text-[15px]",
    md: "text-[18px]",
    lg: "text-[22px]",
    xl: "text-[28px]",
  };

  const starIconSize = starSizes[size] || starSizes.md;

  const stars = [];
  for (let i = 1; i <= maxScore; i++) {
    if (clampedScore >= i) {
      // Full Star
      stars.push(
        <span
          key={i}
          className={`material-symbols-outlined ${starIconSize} text-amber-500 fill-current select-none`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star
        </span>
      );
    } else if (clampedScore >= i - 0.75) {
      // Half Star
      stars.push(
        <span
          key={i}
          className={`material-symbols-outlined ${starIconSize} text-amber-500 select-none`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          star_half
        </span>
      );
    } else {
      // Empty Star
      stars.push(
        <span
          key={i}
          className={`material-symbols-outlined ${starIconSize} text-slate-300 select-none`}
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          star
        </span>
      );
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <div className="flex items-center text-amber-500">{stars}</div>
      {showScoreText && (
        <span className={`text-sm ${scoreTextClass}`}>
          {clampedScore.toFixed(1)} <span className="text-slate-400 font-normal text-xs">/ {maxScore}.0</span>
        </span>
      )}
      {totalReviews !== undefined && (
        <span className="text-xs text-slate-500 font-normal">
          ({totalReviews.toLocaleString()} การประเมิน)
        </span>
      )}
    </div>
  );
}
