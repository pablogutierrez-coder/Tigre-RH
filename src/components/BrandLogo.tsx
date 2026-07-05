import React from 'react';
import logo from '../assets/tigre-rh-logo.png';

interface BrandLogoProps {
  size?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export default function BrandLogo({
  size,
  width,
  height,
  className = '',
}: BrandLogoProps) {
  const resolvedWidth = width ?? size ?? 140;
  const resolvedHeight = height ?? size ?? 48;

  return (
    <img
      src={logo}
      alt="Tigre RH"
      className={`object-contain ${className}`}
      style={{ width: resolvedWidth, height: resolvedHeight }}
    />
  );
}
