import { useEffect, useMemo, useState } from 'react';
import { Link2, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import simklLogo from '../../assets/brands/simkl.svg';
import traktLogo from '../../assets/brands/trakt.svg';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toErrorMessage } from '../../lib/errors';
import {
  beginSimklAuth,
  beginTraktAuth,
  clearPendingProviderAuth,
  completeTraktAuthCallback,
  getPendingSimklPinSession,
  pollSimklAuth,
  saveProviderAuth,
  type SimklPinSession,
  type SyncService,
} from '../../services/onboardingService';
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

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    user,
    householdId,
    selectedSyncService,
    connectedSyncService,
    onboardingStatus,
    refreshOnboarding,
  } = useAuthStore();
  const [step, setStep] = useState<'service' | 'openrouter'>(connectedSyncService ? 'openrouter' : 'service');
  const [selectedService, setSelectedService] = useState<SyncService | null>(selectedSyncService);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [pendingSimklSession, setPendingSimklSession] = useState<SimklPinSession | null>(() => getPendingSimklPinSession());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const onboardingContext = useMemo(() => {
    if (!user || !householdId) {
      return null;
    }

    return {
      householdId,
      userId: user.id,
    };
  }, [householdId, user]);

  useEffect(() => {
    setSelectedService(selectedSyncService);
  }, [selectedSyncService]);

  useEffect(() => {
    if (connectedSyncService) {
      setSelectedService((current) => current ?? connectedSyncService);
      setStep('openrouter');
    }
  }, [connectedSyncService]);

  const callbackCode = searchParams.get('code');
  const callbackError = searchParams.get('error');
  const callbackState = searchParams.get('state');

  useEffect(() => {
    if (!onboardingContext || (!callbackCode && !callbackError)) {
      return;
    }

    let active = true;

    const handleCallback = async () => {
      try {
        setBusy(true);
        setError(null);
        const auth = await completeTraktAuthCallback(searchParams);
        await saveProviderAuth(onboardingContext, 'trakt', auth);
        await refreshOnboarding();

        if (!active) {
          return;
        }

        setSelectedService('trakt');
        setStep('openrouter');
        navigate('/auth/onboarding', { replace: true });
      } catch (nextError) {
        clearPendingProviderAuth();

        if (!active) {
          return;
        }

        setError(toErrorMessage(nextError, 'Unable to finish Trakt authorization.'));
        navigate('/auth/onboarding', { replace: true });
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    };

    void handleCallback();

    return () => {
      active = false;
    };
  }, [callbackCode, callbackError, callbackState, navigate, onboardingContext, refreshOnboarding, searchParams]);

  useEffect(() => {
    if (!onboardingContext || !pendingSimklSession || busy) {
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await pollSimklAuth();

          if (cancelled || result.status !== 'complete') {
            return;
          }

          setBusy(true);
          await saveProviderAuth(onboardingContext, 'simkl', result.auth);
          await refreshOnboarding();

          if (cancelled) {
            return;
          }

          setPendingSimklSession(null);
          setSelectedService('simkl');
          setStep('openrouter');
        } catch (nextError) {
          if (!cancelled) {
            setPendingSimklSession(null);
            setError(toErrorMessage(nextError, 'Unable to finish SIMKL authorization.'));
          }
        } finally {
          if (!cancelled) {
            setBusy(false);
          }
        }
      })();
    }, pendingSimklSession.intervalSeconds * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [busy, onboardingContext, pendingSimklSession, refreshOnboarding]);

  const isTraktConnected = connectedSyncService === 'trakt';
  const isSimklConnected = connectedSyncService === 'simkl';
  const selectedOption = syncServiceOptions.find((option) => option.id === selectedService) ?? null;
  const selectedServiceConnected = selectedService === 'trakt' ? isTraktConnected : selectedService === 'simkl' ? isSimklConnected : false;
  const joinHref = selectedService === 'trakt' ? 'https://trakt.tv/signup' : selectedService === 'simkl' ? 'https://simkl.com/signup' : null;
  const joinLabel = selectedService === 'trakt' ? 'Join Trakt for free' : selectedService === 'simkl' ? 'Join SIMKL for free' : null;

  const handleSelectService = (service: SyncService) => {
    setError(null);
    setSelectedService(service);

    if (pendingSimklSession && service !== 'simkl') {
      clearPendingProviderAuth();
      setPendingSimklSession(null);
    }
  };

  const handleConnectService = async () => {
    if (!onboardingContext || !selectedService) {
      return;
    }

    if (selectedServiceConnected) {
      setStep('openrouter');
      return;
    }

    try {
      setBusy(true);
      setError(null);

      if (selectedService === 'trakt') {
        await beginTraktAuth();
        return;
      }

      clearPendingProviderAuth();
      const pinSession = await beginSimklAuth();
      setPendingSimklSession(pinSession);
    } catch (nextError) {
      setError(toErrorMessage(nextError, `Unable to start ${selectedService === 'trakt' ? 'Trakt' : 'SIMKL'} authorization.`));
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshSimkl = async () => {
    if (!onboardingContext || !pendingSimklSession) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const result = await pollSimklAuth();

      if (result.status !== 'complete') {
        return;
      }

      await saveProviderAuth(onboardingContext, 'simkl', result.auth);
      await refreshOnboarding();
      setPendingSimklSession(null);
      setSelectedService('simkl');
      setStep('openrouter');
    } catch (nextError) {
      setPendingSimklSession(null);
      setError(toErrorMessage(nextError, 'Unable to finish SIMKL authorization.'));
    } finally {
      setBusy(false);
    }
  };

  const handleComplete = async () => {
    setFinishing(true);
    await refreshOnboarding();
    setFinishing(false);
    navigate('/dashboard');
  };

  return (
    <div className="w-full space-y-10 rounded-[40px] border border-white/10 bg-stone-950/40 p-10 shadow-[0_32px_96px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-12">
      {step === 'service' ? (
        <div className="space-y-8">
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Step 1 of 2</p>
            <h1 className="text-4xl font-bold tracking-tight text-white">Connect your sync service</h1>
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
                  className={`relative flex flex-col gap-5 rounded-[24px] border p-5 text-left transition-colors ${
                    isSelected
                      ? 'border-amber-300/40 bg-amber-300/[0.08]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img src={option.logo} alt={option.name} className="h-12 w-12 object-contain" />
                      <p className="text-xl font-bold text-white">{option.name}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {isConnected ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Connected
                        </span>
                      ) : null}
                      <span
                        className={`h-3.5 w-3.5 rounded-full border transition-colors ${
                          isSelected ? 'border-amber-300 bg-amber-300' : 'border-white/30 bg-transparent'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <p className="text-sm leading-6 text-stone-300">{option.description}</p>
                </button>
              );
            })}
          </div>

          <div className="space-y-5 rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex min-h-12 items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {selectedOption ? <img src={selectedOption.logo} alt={selectedOption.name} className="h-9 w-9 object-contain" /> : null}
                <h2 className="text-xl font-bold text-white">{selectedOption ? selectedOption.name : 'Choose a service'}</h2>
              </div>

              {selectedServiceConnected ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Connected
                </span>
              ) : null}
            </div>

            {selectedService === 'simkl' && pendingSimklSession ? (
              <div className="space-y-4 rounded-3xl border border-amber-400/15 bg-amber-400/5 p-5 text-left">
                <p className="text-sm font-medium text-amber-200">Enter this code in SIMKL to finish linking your account.</p>
                <div className="rounded-2xl bg-stone-950/70 px-4 py-5 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">SIMKL code</p>
                  <p className="mt-2 text-3xl font-black tracking-[0.3em] text-white">{pendingSimklSession.userCode}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => {
                      window.open(pendingSimklSession.verificationUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="h-12 flex-1 rounded-2xl bg-white text-sm font-bold text-stone-950 hover:bg-stone-100"
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Open SIMKL verification
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      void handleRefreshSimkl();
                    }}
                    isLoading={busy}
                    className="h-12 flex-1 rounded-2xl"
                  >
                    I authorized SIMKL
                  </Button>
                </div>
                <p className="text-xs leading-relaxed text-stone-400">
                  Crispy tv is checking every {pendingSimklSession.intervalSeconds} seconds until SIMKL confirms the link.
                </p>
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                onClick={() => {
                  void handleConnectService();
                }}
                isLoading={busy}
                disabled={!selectedService || onboardingStatus === 'unknown'}
                className="h-14 flex-1 rounded-2xl bg-white text-lg font-bold text-stone-950 hover:bg-stone-100 disabled:opacity-50"
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
                  className="h-14 rounded-2xl px-8"
                >
                  Skip to OpenRouter
                </Button>
              ) : null}
            </div>

            <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm text-stone-400">
              <span>{selectedOption ? `Need a ${selectedOption.name} account?` : 'Select Trakt or SIMKL'}</span>
              {joinHref && joinLabel ? (
                <a
                  href={joinHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-stone-300 transition hover:text-white"
                >
                  {joinLabel}
                </a>
              ) : null}
            </div>
          </div>

          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="space-y-3 text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Step 2 of 2</p>
            <h1 className="text-4xl font-bold tracking-tight text-white">Add OpenRouter key</h1>
            <p className="text-lg text-stone-400">Optional. Your sync account is linked, so you can finish now and come back to AI setup later.</p>
          </div>

          <div className="space-y-6">
            <Input
              id="openRouterKey"
              type="password"
              label="OpenRouter Key"
              placeholder="sk-or-v1-..."
              value={openRouterKey}
              onChange={(event) => setOpenRouterKey(event.target.value)}
              className="h-14 rounded-2xl border-white/10 bg-stone-900/50 text-white placeholder:text-stone-500 focus:border-white focus:ring-white/20"
            />
            <div className="rounded-2xl border border-white/5 bg-white/5 p-5 text-sm leading-relaxed text-stone-400">
              OpenRouter stays optional. To avoid silently storing another secret, this field is not persisted yet.
            </div>
          </div>

          {connectedSyncService ? (
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5 text-sm text-emerald-200">
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
              className="h-14 w-full rounded-2xl bg-white text-lg font-bold text-stone-950 transition-all hover:scale-[1.02] hover:bg-stone-100 disabled:opacity-50"
            >
              Finish Setup
            </Button>
            <button
              onClick={() => setStep('service')}
              className="text-sm font-medium text-stone-400 transition hover:text-white"
            >
              Back to sync service
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
