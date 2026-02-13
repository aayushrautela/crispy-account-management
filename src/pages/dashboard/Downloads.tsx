import { Monitor, Terminal, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function Downloads() {
  const downloads = [
    {
      os: 'Windows',
      icon: Monitor,
      color: 'text-blue-500',
      version: 'v2.4.0',
      description: '64-bit Installer for Windows 10/11',
      link: '#'
    },
    {
      os: 'Android',
      icon: Smartphone,
      color: 'text-green-500',
      version: 'v2.4.0',
      description: 'APK for Android 8.0+',
      link: '#'
    },
    {
      os: 'Linux',
      icon: Terminal,
      color: 'text-orange-500',
      version: 'v2.4.0',
      description: 'AppImage for generic Linux distros',
      link: '#'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Get the app</h1>
      </div>

      <div className="space-y-3">
        {downloads.map((item) => (
          <div key={item.os} className="flex flex-col md:flex-row items-center justify-between p-5 bg-stone-800 border border-stone-600 rounded-2xl hover:border-stone-500 transition-all group gap-4 shadow-xl shadow-black/10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-800/50 rounded-xl border border-stone-700/50">
                <item.icon className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{item.os}</h3>
                  <span className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400 font-mono border border-stone-700 shrink-0">
                    {item.version}
                  </span>
                </div>
                <p className="text-sm text-stone-400">{item.description}</p>
              </div>
            </div>
            <Button variant="secondary" className="w-full md:w-auto px-6">
              Get the app
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-5 rounded-xl bg-stone-800/50 border border-stone-700">
         <h3 className="text-sm font-semibold text-white mb-1">Looking for other platforms?</h3>
         <p className="text-sm text-gray-500">
           iOS and MacOS versions are currently in beta testing. Join our Discord to get early access.
         </p>
      </div>
    </div>
  );
}
