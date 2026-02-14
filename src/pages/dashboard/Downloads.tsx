import type { ComponentType } from 'react';
import { Monitor, Smartphone, Terminal } from 'lucide-react';
import { Card } from '../../components/ui/Card';

interface DownloadItem {
  os: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
  envKey: string;
}

const downloadItems: DownloadItem[] = [
  {
    os: 'Windows',
    icon: Monitor,
    description: '64-bit installer for Windows 10/11.',
    envKey: 'VITE_DOWNLOAD_URL_WINDOWS',
  },
  {
    os: 'Android',
    icon: Smartphone,
    description: 'APK package for Android 8.0+.',
    envKey: 'VITE_DOWNLOAD_URL_ANDROID',
  },
  {
    os: 'Linux',
    icon: Terminal,
    description: 'AppImage package for Linux distributions.',
    envKey: 'VITE_DOWNLOAD_URL_LINUX',
  },
];

function downloadUrlFor(envKey: string): string | null {
  const value = import.meta.env[envKey] as string | undefined;
  return value?.trim() ? value.trim() : null;
}

export default function Downloads() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Get the app</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Download the native app for your device.
        </p>
      </div>

      <div className="space-y-3">
        {downloadItems.map((item) => {
          const url = downloadUrlFor(item.envKey);

          return (
            <Card
              key={item.os}
              className="flex flex-col items-start justify-between gap-4 border-stone-600 p-5 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-stone-700/50 bg-stone-800/50 p-3">
                  <item.icon className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.os}</h3>
                  <p className="text-sm text-stone-400">{item.description}</p>
                </div>
              </div>

              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-amber-500 px-6 text-sm font-semibold text-stone-900 transition-colors hover:bg-amber-400 md:w-auto"
                >
                  Download
                </a>
              ) : (
                <span className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-stone-600 bg-stone-700 px-6 text-sm font-semibold text-stone-300 md:w-auto">
                  Coming soon
                </span>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="border-stone-700 p-5">
        <h3 className="text-sm font-semibold text-white">Need another platform?</h3>
        <p className="mt-1 text-sm text-stone-400">
          iOS and macOS builds are in private beta. Contact the Crispy team for early access.
        </p>
      </Card>
    </div>
  );
}
