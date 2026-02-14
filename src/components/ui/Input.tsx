import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, id, label, error, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="space-y-2">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-stone-300">
            {label}
          </label>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={cn(
            "flex h-10 w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error && "border-red-500 focus:ring-red-500/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p id={errorId} className="text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
