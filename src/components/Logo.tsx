import React from "react";

export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Syncora"
    >
      {/* Glow effect */}
      <circle cx="512" cy="512" r="420" fill="oklch(0.585 0.204 277.1 / 0.15)" />
      
      {/* Outer audio rings */}
      <circle
        cx="512"
        cy="512"
        r="380"
        stroke="var(--color-indigo)"
        strokeWidth="28"
        strokeDasharray="40 18"
        opacity="0.85"
      />
      <circle
        cx="512"
        cy="512"
        r="270"
        stroke="var(--color-indigo-soft)"
        strokeWidth="20"
        strokeDasharray="25 14"
        opacity="0.6"
      />

      {/* Central musical note / sound pin */}
      <circle cx="440" cy="620" r="80" fill="var(--color-indigo)" />
      <circle cx="600" cy="540" r="70" fill="var(--color-indigo)" />
      <path
        d="M520 620V320C520 300 540 280 570 290L670 320C690 328 700 345 700 365V540"
        stroke="var(--color-indigo)"
        strokeWidth="48"
        strokeLinecap="round"
      />
      <circle cx="440" cy="620" r="32" fill="var(--color-ink)" />
      <circle cx="600" cy="540" r="28" fill="var(--color-ink)" />
    </svg>
  );
}
