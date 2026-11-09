"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showMark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, variant = "default", showMark = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { text: "text-lg", mark: 22 },
    md: { text: "text-xl", mark: 28 },
    lg: { text: "text-3xl", mark: 40 },
  };
  const s = sizes[size];
  const isLight = variant === "light";

  return (
    <span className={cn("inline-flex items-center gap-2 font-display font-extrabold tracking-tight", s.text, className)}>
      {showMark && (
        <svg
          width={s.mark}
          height={s.mark}
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect
            x="1"
            y="1"
            width="38"
            height="38"
            rx="11"
            fill="url(#coo-grad)"
            stroke="url(#coo-grad)"
            strokeWidth="1"
          />
          {/* horizon arc / sun rising over a line — evokes mobility + horizon */}
          <circle cx="20" cy="18" r="6.5" fill="#ffffff" opacity="0.95" />
          <path
            d="M7 26.5C11.5 24.5 15.5 23.5 20 23.5C24.5 23.5 28.5 24.5 33 26.5"
            stroke="#9FE3C8"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path d="M8 31.5H32" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
          <defs>
            <linearGradient id="coo-grad" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
              <stop stopColor="#17365D" />
              <stop offset="0.55" stopColor="#2563A6" />
              <stop offset="1" stopColor="#15966A" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <span className={cn(isLight ? "text-white" : "text-navy")}>
        COORI
        <span className={isLight ? "text-white" : "text-brand"}>ZON</span>
      </span>
    </span>
  );
}
