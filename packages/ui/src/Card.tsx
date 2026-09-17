import type React from 'react';

type CardProps = React.HTMLAttributes<HTMLElement> & { as?: 'article' | 'section' | 'div' };
export const Card = ({ as: Element = 'section', className = '', ...props }: CardProps) => (
  <Element className={`rounded-[var(--radius-lg)] border border-pulsio-line bg-white p-5 shadow-pulsio ${className}`} {...props} />
);
