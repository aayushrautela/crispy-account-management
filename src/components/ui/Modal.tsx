import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, className }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;

    const focusTarget = dialogRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
      previouslyFocusedElementRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
        className={cn(
          'relative w-full max-w-md rounded-lg border border-stone-800 bg-stone-950 p-0 shadow-2xl',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-stone-900 p-6">
          <h2 id={titleId} className="text-base font-bold text-white">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
