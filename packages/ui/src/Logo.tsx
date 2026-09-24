import type React from 'react';

type LogoProps = React.SVGProps<SVGSVGElement> & { label?: string };

export const Logo = ({ label = 'Pulsio', className, ...props }: LogoProps) => (
  <svg viewBox="0 0 160 40" role="img" aria-label={label} className={className} {...props}>
    <text x="0" y="30" fill="currentColor" fontFamily="Inter, sans-serif" fontSize="32" fontWeight="800" letterSpacing="-2">
      pulsio
    </text>
    <circle cx="151" cy="27" r="4" fill="#055DFE" />
  </svg>
);
