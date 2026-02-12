import { Monitor, Smartphone, Terminal } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function Downloads() {
  const downloads = [
    {
      os: 'Windows',
      icon: <Monitor size={48} className="text-blue-500" />,
      version: 'v2.4.0',
      description: '64-bit Installer for Windows 10/11',
      link: '#'
    },
    {
      os: 'Android',
      icon: <Smartphone size={48} className="text-green-500" />,
      version: 'v2.4.0',
      description: 'APK for Android 8.0+',
      link: '#'
    },
    {
      os: 'Linux',
      icon: <Terminal size={48} className="text-orange-500" />,
      version: 'v2.4.0',
      description: 'AppImage for generic Linux distros',
      link: '#'
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Downloads</h1>
        <p className="text-gray-400 mt-1">Get the latest Crispy clients for your devices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {downloads.map((item) => (
          <Card key={item.os} className="p-6 flex flex-col items-center text-center hover:border-gray-700 transition-colors">
            <div className="mb-4 p-4 bg-gray-900 rounded-full border border-gray-800">
              {item.icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{item.os}</h3>
            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-xs font-mono mb-3">
              {item.version}
            </span>
            <p className="text-sm text-gray-400 mb-6">
              {item.description}
            </p>
            <Button className="w-full" onClick={() => window.open(item.link, '_blank')}>
              Download
            </Button>
          </Card>
        ))}
      </div>
      
      <div className="mt-12 p-6 rounded-xl bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-white/5">
         <h3 className="text-lg font-semibold text-white mb-2">Looking for other platforms?</h3>
         <p className="text-gray-400 text-sm">
           iOS and MacOS versions are currently in beta testing. Join our Discord to get early access.
         </p>
      </div>
    </div>
  );
}
