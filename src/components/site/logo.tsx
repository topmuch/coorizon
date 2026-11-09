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
    sm: { height: 44, radius: 6 },
    md: { height: 56, radius: 8 },
    lg: { height: 80, radius: 10 },
    xl: { height: 110, radius: 12 },
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
