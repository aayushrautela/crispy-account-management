import React from 'react';
import { Button } from './ui/Button';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  public constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error): void {
    console.error('Unhandled application error', error);
  }

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-800 p-6">
          <h1 className="text-xl font-semibold">Something broke</h1>
          <p className="mt-2 text-sm text-stone-300">
            The app hit an unexpected error. Reload to recover.
          </p>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()}>Reload App</Button>
          </div>
        </div>
      </div>
    );
  }
}
