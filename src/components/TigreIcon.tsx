/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface TigreIconProps {
  className?: string;
  size?: number;
}

export default function TigreIcon({ className = "text-fuchsia-600", size = 48 }: TigreIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background soft tech hexagonal or circular grid elements */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" opacity="0.15" />
      
      {/* Sleek, Geometric Tech Tiger/Felino Head Outline & Fills */}
      {/* Left Ear */}
      <path
        d="M28 24 L42 36 L25 40 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M30 27 L38 34 L28 36 Z" fill="currentColor" fillOpacity="0.4" />

      {/* Right Ear */}
      <path
        d="M72 24 L58 36 L75 40 Z"
        fill="currentColor"
        fillOpacity="0.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M70 27 L62 34 L72 36 Z" fill="currentColor" fillOpacity="0.4" />

      {/* Tiger Face Outer Profile (Geometric) */}
      <path
        d="M50 20 L58 36 L75 40 L68 55 L74 68 L64 78 L50 85 L36 78 L26 68 L32 55 L25 40 L42 36 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity="0.05"
      />

      {/* Tech Tiger Stripes (Abstract & Minimalist) */}
      {/* Left cheek stripe */}
      <path d="M28 48 L38 48 L32 53 Z" fill="currentColor" />
      <path d="M26 58 L36 56 L30 62 Z" fill="currentColor" />
      {/* Right cheek stripe */}
      <path d="M72 48 L62 48 L68 53 Z" fill="currentColor" />
      <path d="M74 58 L64 56 L70 62 Z" fill="currentColor" />
      
      {/* Forehead Stripes */}
      <path d="M44 26 L56 26 L50 34 Z" fill="currentColor" />
      <path d="M46 32 L54 32 L50 38 Z" fill="currentColor" />

      {/* Futuristic glowing geometric eyes */}
      {/* Left Eye */}
      <polygon
        points="36,44 46,44 44,48 38,48"
        fill="#f43f5e" /* Rose/Magenta glow */
        stroke="#f43f5e"
        strokeWidth="1"
      />
      {/* Right Eye */}
      <polygon
        points="64,44 54,44 56,48 62,48"
        fill="#f43f5e" /* Rose/Magenta glow */
        stroke="#f43f5e"
        strokeWidth="1"
      />

      {/* Nose & Snout */}
      <path
        d="M50 54 L44 48 L56 48 Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Mouth lines */}
      <path
        d="M50 54 L50 64 M50 64 L42 60 M50 64 L58 60"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Decorative cybernetic lines */}
      <circle cx="50" cy="54" r="2" fill="#3b82f6" /> {/* Blue electric center dot */}
      <path d="M50 20 L50 12" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="1 1" />
      <circle cx="50" cy="10" r="1.5" fill="#3b82f6" />
    </svg>
  );
}
