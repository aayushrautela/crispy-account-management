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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-stone-800 pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-medium text-white">Get the app</h1>
          <p className="text-sm text-stone-500">
            Download the native app for your device.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {downloadItems.map((item) => {
          const url = downloadUrlFor(item.envKey);

          return (
            <Card
              key={item.os}
              className="flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-stone-800 bg-stone-900/50">
                  <item.icon className="h-5 w-5 text-stone-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">{item.os}</h3>
                  <p className="text-sm text-stone-500">{item.description}</p>
                </div>
              </div>

              {url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-stone-200 md:w-auto"
                >
                  Download
                </a>
              ) : (
                <span className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-stone-700 bg-stone-800 px-4 text-sm font-medium text-stone-400 md:w-auto">
                  Coming soon
                </span>
              )}
            </Card>
          );
        })}
      </div>

      <Card className="bg-transparent border-none p-0">
        <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-5 text-sm">
          <p className="text-stone-300">
            <strong className="font-medium text-white">Need another platform?</strong> iOS and macOS builds are in private beta. Contact the Crispy tv team for early access.
          </p>
        </div>
      </Card>
    </div>
  );
}
