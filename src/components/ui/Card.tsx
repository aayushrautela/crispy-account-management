import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div 
      className={cn(
        "rounded-2xl border border-stone-700 bg-stone-800 shadow-xl shadow-black/10",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
