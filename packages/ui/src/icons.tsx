import type React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const ChevronDown = (props: IconProps) => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
    <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
