"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-14 w-14",
} as const;

type BrandIsotypeSize = keyof typeof SIZES;

interface BrandIsotypeProps {
  size?: BrandIsotypeSize;
  className?: string;
  /** Sombra más marcada en login / hero */
  elevated?: boolean;
}

/**
 * Isotipo de Vertia ScoreOps — SVG con fondo transparente fuera del redondeo.
 */
export function BrandIsotype({
  size = "sm",
  className,
  elevated = false,
}: BrandIsotypeProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `brand-iso-grad-${uid}`;
  const shineId = `brand-iso-shine-${uid}`;
  const shadowId = `brand-iso-shadow-${uid}`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 overflow-visible", SIZES[size], className)}
      role="img"
      aria-label="Vertia ScoreOps"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14b8a6" />
          <stop offset="0.45" stopColor="#0f766e" />
          <stop offset="1" stopColor="#134e4a" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="48" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.22" />
          <stop offset="0.6" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <filter
          id={shadowId}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy={elevated ? "5" : "3"}
            stdDeviation={elevated ? "5" : "3"}
            floodColor="#0f766e"
            floodOpacity={elevated ? "0.4" : "0.28"}
          />
        </filter>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <rect width="48" height="48" rx="14" fill={`url(#${gradId})`} />
        <rect width="48" height="48" rx="14" fill={`url(#${shineId})`} />
        <rect
          x="0.75"
          y="0.75"
          width="46.5"
          height="46.5"
          rx="13.25"
          stroke="white"
          strokeOpacity="0.2"
          fill="none"
        />

        <rect x="11" y="28" width="6" height="11" rx="2" fill="white" fillOpacity="0.75" />
        <rect x="21" y="22" width="6" height="17" rx="2" fill="white" fillOpacity="0.9" />
        <rect x="31" y="14" width="6" height="25" rx="2" fill="white" />

        <path
          d="M 13 18 C 18 11, 24 9, 35 12"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="35" cy="12" r="2.5" fill="#fde68a" className="live-dot" />
        <circle cx="35" cy="12" r="1.1" fill="white" fillOpacity="0.95" />
      </g>
    </svg>
  );
}
