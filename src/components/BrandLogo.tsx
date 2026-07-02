import React from 'react';
import logo from '../assets/automatizate-logo.jpg';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export default function BrandLogo({ size = 48, className = '' }: BrandLogoProps) {
  return (
    <img
      src={logo}
      alt="Automatizate"
      width={size}
      height={size}
      className={`rounded-2xl object-contain bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
