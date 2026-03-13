import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import simklLogo from '../../assets/brands/simkl.svg';
import traktLogo from '../../assets/brands/trakt.svg';
import { Button } from '../../components/ui/Button';
import { toErrorMessage } from '../../lib/errors';
import {
  beginSimklAuth,
  beginTraktAuth,
  clearPendingProviderAuth,
  completeTraktAuthCallback,
  getPendingSimklPinSession,
  pollSimklAuth,
  saveProviderAuth,
  saveProviderAuthForProfile,
  type ProviderAuthPayload,
  type SimklPinSession,
  type SyncService,
} from '../../services/onboardingService';
import { useAuthStore } from '../../store/useAuthStore';

const providerConfig = {
  trakt: {
    name: 'Trakt',
    logo: traktLogo,
    loadingTitle: 'Redirecting to Trakt',
    loadingBody: 'You will be sent to Trakt to approve access, then Crispy tv will bring you right back.',
    errorMessage: 'Unable to finish Trakt authorization.',
  },
  simkl: {
    name: 'SIMKL',
    logo: simklLogo,
    loadingTitle: 'Connect SIMKL',
    loadingBody: 'Use the code below to approve SIMKL, then Crispy tv will finish the connection automatically.',
    errorMessage: 'Unable to finish SIMKL authorization.',
  },
} satisfies Record<SyncService, { name: string; logo: string; loadingTitle: string; loadingBody: string; errorMessage: string }>;

function normalizeReturnTo(value: string | null): string {
  return value && value.startsWith('/') ? value : '/auth/onboarding';
}

export default function ProviderConnect() {
  const navigate = useNavigate();
  const { provider: routeProvider } = useParams();
  const [searchParams] = useSearchParams();
  const { user, householdId, refreshOnboarding } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSimklSession, setPendingSimklSession] = useState<SimklPinSession | null>(() => getPendingSimklPinSession());

  const provider: SyncService | null = routeProvider === 'trakt' || routeProvider === 'simkl' ? routeProvider : null;
  const targetProfileId = searchParams.get('targetProfileId')?.trim() || null;
  const returnTo = useMemo(() => normalizeReturnTo(searchParams.get('returnTo')), [searchParams]);
  const onboardingContext = useMemo(() => {
    if (!user || !householdId) {
      return null;
    }

    return {
      householdId,
      userId: user.id,
    };
  }, [householdId, user]);

  const config = provider ? providerConfig[provider] : null;
  const backLabel = returnTo === '/dashboard' ? 'Back to profiles' : 'Back to onboarding';

  const finishConnection = useCallback(
    async (service: SyncService, auth: ProviderAuthPayload, authTargetProfileId: string | null, authReturnTo: string | null) => {
      const resolvedTargetProfileId = authTargetProfileId ?? targetProfileId;

      if (resolvedTargetProfileId) {
        await saveProviderAuthForProfile(resolvedTargetProfileId, service, auth);
      } else {
        if (!onboardingContext) {
          throw new Error('Account context is not ready yet.');
        }

        await saveProviderAuth(onboardingContext, service, auth);
      }

      await refreshOnboarding();
      navigate(authReturnTo ?? returnTo, { replace: true });
    },
    [navigate, onboardingContext, refreshOnboarding, returnTo, targetProfileId],
  );

  useEffect(() => {
    if (provider !== 'trakt') {
      return;
    }

    let active = true;
    const hasCallbackPayload = Boolean(searchParams.get('code') || searchParams.get('error'));

    void (async () => {
      try {
        setBusy(true);
        setError(null);

        if (hasCallbackPayload) {
          const result = await completeTraktAuthCallback(searchParams);

          if (!active) {
            return;
          }

          await finishConnection('trakt', result.auth, result.targetProfileId, result.returnTo);
          return;
        }

        await beginTraktAuth({
          targetProfileId: targetProfileId ?? undefined,
          returnTo,
        });
      } catch (nextError) {
        clearPendingProviderAuth();

        if (active) {
          setError(toErrorMessage(nextError, providerConfig.trakt.errorMessage));
          setBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [finishConnection, provider, returnTo, searchParams, targetProfileId]);

  useEffect(() => {
    if (provider !== 'simkl') {
      return;
    }

    const pending = getPendingSimklPinSession();

    if (pending && pending.targetProfileId === targetProfileId && pending.returnTo === returnTo) {
      setPendingSimklSession(pending);
      return;
    }

    let active = true;

    void (async () => {
      try {
        setBusy(true);
        setError(null);
        setPendingSimklSession(null);
        clearPendingProviderAuth();

        const session = await beginSimklAuth({
          targetProfileId: targetProfileId ?? undefined,
          returnTo,
        });

        if (active) {
          setPendingSimklSession(session);
        }
      } catch (nextError) {
        if (active) {
          setError(toErrorMessage(nextError, providerConfig.simkl.errorMessage));
        }
      } finally {
        if (active) {
          setBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [provider, returnTo, targetProfileId]);

  useEffect(() => {
    if (provider !== 'simkl' || !pendingSimklSession || busy) {
      return;
    }

    let cancelled = false;
    let timeoutId = 0;

    const pollUntilComplete = async () => {
      try {
        const result = await pollSimklAuth();

        if (cancelled) {
          return;
        }

        if (result.status === 'complete') {
          setBusy(true);
          await finishConnection('simkl', result.auth, result.targetProfileId, result.returnTo);
          return;
        }

        timeoutId = window.setTimeout(pollUntilComplete, result.intervalSeconds * 1000);
      } catch (nextError) {
        if (!cancelled) {
          setPendingSimklSession(null);
          setError(toErrorMessage(nextError, providerConfig.simkl.errorMessage));
        }
      }
    };

    timeoutId = window.setTimeout(pollUntilComplete, pendingSimklSession.intervalSeconds * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [busy, finishConnection, pendingSimklSession, provider]);

  const handleManualSimklRefresh = async () => {
    if (!pendingSimklSession) {
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const result = await pollSimklAuth();

      if (result.status !== 'complete') {
        return;
      }

      await finishConnection('simkl', result.auth, result.targetProfileId, result.returnTo);
    } catch (nextError) {
      setPendingSimklSession(null);
      setError(toErrorMessage(nextError, providerConfig.simkl.errorMessage));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (provider === 'simkl') {
      clearPendingProviderAuth();
      setPendingSimklSession(null);
    }

    navigate(returnTo, { replace: true });
  };

  if (!provider || !config) {
    return (
      <div className="rounded-[32px] border border-red-500/20 bg-red-500/10 p-8 text-white">
        <h1 className="text-2xl font-bold">Unknown provider</h1>
        <p className="mt-3 text-sm text-red-100">This auth route only supports Trakt and SIMKL.</p>
        <div className="mt-6">
          <Button variant="secondary" onClick={handleCancel}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 rounded-[32px] border border-white/10 bg-stone-950/50 p-8 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-10">
      <div className="flex items-center gap-4">
        <img src={config.logo} alt={config.name} className="h-14 w-14 object-contain" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">Provider connection</p>
          <h1 className="text-3xl font-bold tracking-tight text-white">{config.loadingTitle}</h1>
        </div>
      </div>

      <p className="text-base leading-7 text-stone-300">{config.loadingBody}</p>

      {provider === 'trakt' ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
          {error ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
              <Button onClick={() => navigate(`/auth/connect/trakt?returnTo=${encodeURIComponent(returnTo)}${targetProfileId ? `&targetProfileId=${encodeURIComponent(targetProfileId)}` : ''}`, { replace: true })}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-300" />
              <p className="text-sm text-stone-400">Waiting for Trakt to complete the authorization handshake.</p>
            </div>
          )}
        </div>
      ) : null}

      {provider === 'simkl' ? (
        <div className="space-y-4 rounded-3xl border border-sky-500/20 bg-sky-500/10 p-6">
          {error ? <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

          {pendingSimklSession ? (
            <>
              <div className="rounded-2xl border border-sky-500/20 bg-stone-950/80 p-5 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200/70">SIMKL code</p>
                <p className="mt-3 text-4xl font-black tracking-[0.3em] text-white">{pendingSimklSession.userCode}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm text-emerald-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Crispy tv will keep checking for approval automatically. You can also confirm it manually after authorizing.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={pendingSimklSession.verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-stone-950 transition hover:bg-stone-100"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open SIMKL verification
                </a>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void handleManualSimklRefresh();
                  }}
                  isLoading={busy}
                  className="h-12 flex-1 rounded-2xl"
                >
                  I authorized SIMKL
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-stone-300">
              {busy ? 'Preparing your SIMKL code...' : 'Starting SIMKL authorization...'}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex justify-start">
        <Button variant="ghost" onClick={handleCancel} disabled={busy && provider === 'trakt'}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
