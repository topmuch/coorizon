"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showMark?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, variant = "default", showMark = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { height: 28 },
    md: { height: 36 },
    lg: { height: 48 },
  };
  const s = sizes[size];

  return (
    <span className={cn("inline-flex items-center", className)}>
      {showMark && (
        <Image
          src="/coorizon-logo.jpg"
          alt="COORIZON"
          height={s.height}
          width={s.height * 3}
          className="h-auto w-auto"
          style={{ height: `${s.height}px`, width: "auto" }}
          priority
        />
      )}
    </span>
  );
}
