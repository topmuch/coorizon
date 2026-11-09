"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "light";
  showMark?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Logo({ className, variant = "default", showMark = true, size = "md" }: LogoProps) {
  const sizes = {
    sm: { height: 32, radius: 4 },
    md: { height: 44, radius: 6 },
    lg: { height: 60, radius: 8 },
    xl: { height: 80, radius: 10 },
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
          style={{
            height: `${s.height}px`,
            width: "auto",
            borderRadius: `${s.radius}px`,
            objectFit: "contain",
          }}
          priority
        />
      )}
    </span>
  );
}
