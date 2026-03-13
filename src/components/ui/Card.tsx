import React from 'react';
import { cn } from '../../lib/utils';

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-stone-800 bg-stone-900/30 p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
