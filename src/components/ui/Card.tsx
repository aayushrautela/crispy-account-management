import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div 
      className={cn(
        "rounded-xl border border-gray-800 bg-gray-900",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}
