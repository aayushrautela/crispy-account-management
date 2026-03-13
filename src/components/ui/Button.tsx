import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
}

export function Button({ 
  children, 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading, 
  fullWidth,
  disabled, 
  ...props 
}: ButtonProps) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#090b10] disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    primary: 'rounded-lg bg-stone-100 text-stone-900 hover:bg-stone-200 focus:ring-stone-500',
    secondary: 'rounded-lg border border-stone-800 bg-stone-900/50 text-stone-300 hover:bg-stone-800 hover:text-white focus:ring-stone-500',
    danger: 'rounded-lg bg-red-950 text-red-200 border border-red-900/50 hover:bg-red-900 focus:ring-red-600',
    ghost: 'rounded-lg bg-transparent text-stone-500 hover:bg-stone-900 hover:text-stone-300',
    outline: 'rounded-lg border border-stone-800 bg-transparent text-stone-400 hover:border-stone-700 hover:bg-stone-900 hover:text-stone-200'
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg'
  };

  return (
    <button
      className={cn(
        baseStyles, 
        variants[variant], 
        sizes[size], 
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <Loader2 className="absolute h-4 w-4 animate-spin" /> : null}
      <span className={cn('inline-flex items-center justify-center', isLoading && 'opacity-0')}>
        {children}
      </span>
    </button>
  );
}
