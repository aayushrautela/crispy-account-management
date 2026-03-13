import { useEffect, useState } from 'react';
import { ExternalLink, House, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import simklLogo from '../../assets/brands/simkl.svg';
import traktLogo from '../../assets/brands/trakt.svg';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { type SyncService } from '../../services/onboardingService';
import { useAuthStore } from '../../store/useAuthStore';

const syncServiceOptions: Array<{
  id: SyncService;
  name: string;
  logo: string;
  description: string;
}> = [
  {
    id: 'trakt',
    name: 'Trakt',
    logo: traktLogo,
    description: 'Trakt is free to use with a standard account and powers thousands of community developed apps.',
  },
  {
    id: 'simkl',
    name: 'SIMKL',
    logo: simklLogo,
    description: 'Simkl is a platform that helps its members track, discover, and manage their TV shows, movies, and anime consumption.',
  },
];

const openRouterBenefits = [
  {
    title: 'AI insights on every title',
    description: 'Get quick context on what makes a movie or show worth your time before you press play.',
    icon: Sparkles,
  },
  {
    title: 'Smarter search and discovery',
    description: 'Find hidden gems faster with natural-language search that understands mood, genre, and vibe.',
    icon: Search,
  },
  {
    title: 'A home screen curated for you',
    description: 'Surface personal recommendations shaped around your watch history instead of generic lists.',
    icon: House,
  },
] as const;

export default function Onboarding() {
  const navigate = useNavigate();
  const {
    selectedSyncService,
    connectedSyncService,
    onboardingStatus,
    refreshOnboarding,
  } = useAuthStore();
  const [step, setStep] = useState<'service' | 'openrouter'>(connectedSyncService ? 'openrouter' : 'service');
  const [selectedService, setSelectedService] = useState<SyncService | null>(selectedSyncService);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    setSelectedService(selectedSyncService);
  }, [selectedSyncService]);

  useEffect(() => {
    if (connectedSyncService) {
      setSelectedService((current) => current ?? connectedSyncService);
      setStep('openrouter');
    }
  }, [connectedSyncService]);

  const isTraktConnected = connectedSyncService === 'trakt';
  const isSimklConnected = connectedSyncService === 'simkl';
  const selectedOption = syncServiceOptions.find((option) => option.id === selectedService) ?? null;
  const selectedServiceConnected = selectedService === 'trakt' ? isTraktConnected : selectedService === 'simkl' ? isSimklConnected : false;
  const joinHref = selectedService === 'trakt' ? 'https://trakt.tv/signup' : selectedService === 'simkl' ? 'https://simkl.com/signup' : null;
  const joinLabel = selectedService === 'trakt' ? 'Join Trakt for free' : selectedService === 'simkl' ? 'Join SIMKL for free' : null;

  const handleSelectService = (service: SyncService) => {
    setSelectedService(service);
  };

  const handleConnectService = async () => {
    if (!selectedService) {
      return;
    }

    if (selectedServiceConnected) {
      setStep('openrouter');
      return;
    }

    navigate(`/auth/connect/${selectedService}?returnTo=${encodeURIComponent('/auth/onboarding')}`);
  };

  const handleComplete = async () => {
    setFinishing(true);
    await refreshOnboarding();
    setFinishing(false);
    navigate('/dashboard');
  };

  return (
    <div className="w-full space-y-8 rounded-lg border border-stone-800 bg-stone-900 p-8 shadow-sm sm:p-10">
      {step === 'service' ? (
        <div className="space-y-8">
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-medium text-stone-400">Step 1 of 2</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Connect your sync service</h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {syncServiceOptions.map((option) => {
              const isSelected = selectedService === option.id;
              const isConnected = connectedSyncService === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelectService(option.id)}
                  aria-pressed={isSelected}
                  className={`relative flex flex-col gap-4 rounded-lg border p-5 text-left transition-colors ${
                    isSelected
                      ? 'border-stone-400 bg-stone-800'
                      : 'border-stone-800 bg-stone-900 hover:border-stone-700 hover:bg-stone-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={option.logo} alt={option.name} className="h-10 w-10 object-contain" />
                      <p className="text-lg font-bold text-white">{option.name}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Connected
                        </span>
                      ) : null}
                      <span
                        className={`h-3 w-3 rounded-full border transition-colors ${
                          isSelected ? 'border-white bg-white' : 'border-stone-600 bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-stone-400">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 rounded-lg border border-stone-800 bg-stone-900/50 p-6">
            <div className="flex min-h-12 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedOption ? <img src={selectedOption.logo} alt={selectedOption.name} className="h-8 w-8 object-contain" /> : null}
                <h2 className="text-lg font-bold text-white">{selectedOption ? selectedOption.name : 'Choose a service'}</h2>
              </div>

              {selectedServiceConnected ? (
                <span className="inline-flex items-center gap-2 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Connected
                </span>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  void handleConnectService();
                }}
                disabled={!selectedService || onboardingStatus === 'unknown'}
                className="h-12 flex-1 text-base font-semibold"
              >
                {!selectedOption
                  ? 'Select Trakt or SIMKL'
                  : selectedServiceConnected
                    ? 'Continue'
                    : `Connect ${selectedOption.name}`}
              </Button>

              {selectedServiceConnected ? (
                <Button
                  variant="secondary"
                  onClick={() => setStep('openrouter')}
                  className="h-12 px-6"
                >
                  Skip to OpenRouter
                </Button>
              ) : null}
            </div>

            <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-t border-stone-800 pt-4 text-sm text-stone-500">
              <span>{selectedOption ? `Need a ${selectedOption.name} account?` : 'Select Trakt or SIMKL'}</span>
              {joinHref && joinLabel ? (
                <a
                  href={joinHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-stone-400 transition hover:text-white"
                >
                  {joinLabel}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-2 text-center sm:text-left">
            <p className="text-xs font-medium text-stone-400">Step 2 of 2</p>
            <h1 className="text-2xl font-bold tracking-tight text-white">Turn on AI discovery</h1>
            <p className="text-base text-stone-400">
              Connect OpenRouter to unlock AI insights, better search, and personal recommendations.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {openRouterBenefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div key={benefit.title} className="rounded-lg border border-stone-800 bg-stone-900/50 p-5">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-stone-800 bg-stone-800 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-base font-semibold text-white">{benefit.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-stone-400">{benefit.description}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-6 rounded-lg border border-stone-800 bg-stone-900/50 p-6 sm:p-7">
            <div className="space-y-1">
              <p className="text-xs font-medium text-stone-500">Simple setup</p>
              <h2 className="text-xl font-bold text-white">Paste your OpenRouter key</h2>
              <p className="text-sm leading-relaxed text-stone-400">
                Grab a key, paste it here, and Crispy tv can start powering AI recommendations and search.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-stone-100 px-4 text-sm font-semibold text-stone-900 transition hover:bg-stone-200"
              >
                Get your free key
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
              <div className="flex items-center rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-4 text-xs text-emerald-400">
                Optional for now - you can finish onboarding without it.
              </div>
            </div>

            <Input
              id="openRouterKey"
              name="openRouterKey"
              type="password"
              autoComplete="off"
              label="OpenRouter key"
              placeholder="Paste your key here"
              value={openRouterKey}
              onChange={(event) => setOpenRouterKey(event.target.value)}
              className="h-10"
            />

            <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-4 text-xs leading-relaxed text-stone-500">
              Your key is not being saved yet. You can still finish setup now and wire up secure key storage later.
            </div>
          </div>

          {connectedSyncService ? (
            <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/5 p-4 text-sm text-emerald-400">
              {connectedSyncService === 'trakt' ? 'Trakt' : 'SIMKL'} is connected and your onboarding requirement is complete.
            </div>
          ) : null}

          <div className="flex flex-col gap-4">
            <Button
              onClick={() => {
                void handleComplete();
              }}
              isLoading={finishing}
              disabled={!connectedSyncService}
              className="h-12 w-full text-base font-bold"
            >
              Finish setup
            </Button>
            <button
              onClick={() => setStep('service')}
              className="text-sm font-medium text-stone-500 transition hover:text-white"
            >
              Back to sync service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
