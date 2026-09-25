import cx from 'clsx-tw';
import type React from 'react';

type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'section' | 'div';
};

export const Card = ({ className, as: Element = 'section', ...props }: CardProps) => {
  return <Element className={cx('rounded-lg border border-pulsio-line bg-white p-5 shadow-pulsio', className)} {...props} />;
};
