import type { ComponentProps } from 'react';
import { Link, useRoute } from 'wouter';

type NavLinkProps = {
  to: string;
  children: React.ReactNode;
} & ComponentProps<any>;

export const NavLink = ({ className, to, children, ...props }: NavLinkProps) => {
  const [isActive] = useRoute(to);

  return (
    <Link className={className} href={to} aria-current={isActive ? 'page' : undefined} {...props}>
      {children}
    </Link>
  );
};
