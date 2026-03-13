import logoWordmark from '../assets/logo-wordmark.svg';
import { Skeleton } from './ui/Skeleton';

interface AppBootScreenProps {
  title: string;
  message: string;
  eyebrow?: string;
}

export function AppBootScreen({ title, message, eyebrow = 'Crispy tv' }: AppBootScreenProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-950 px-6 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03),transparent_40%,rgba(255,255,255,0.02))]" />

      <div className="relative w-full max-w-xl rounded-[32px] border border-white/10 bg-stone-950/75 p-8 shadow-[0_28px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
        <div className="space-y-8" aria-live="polite">
          <div className="space-y-5">
            <img src={logoWordmark} alt="Crispy tv" className="h-9 w-auto" />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">{eyebrow}</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
              <p className="max-w-lg text-sm leading-7 text-stone-300 sm:text-base">{message}</p>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-[1.35fr_0.9fr]">
              <div className="space-y-3">
                <Skeleton className="h-5 w-32 rounded-full" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              </div>

              <div className="space-y-3">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
                <Skeleton className="h-14 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
