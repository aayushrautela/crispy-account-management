import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import simklLogo from '../../assets/brands/simkl.svg';
import traktLogo from '../../assets/brands/trakt.svg';
import { Button } from '../../components/ui/Button';
import { toErrorMessage } from '../../lib/errors';
import {
  beginSimklAuth,
  beginTraktAuth,
  clearPendingProviderAuth,
  completeSimklAuthCallback,
  completeTraktAuthCallback,
  saveProviderAuth,
  saveProviderAuthForProfile,
  type ProviderAuthPayload,
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
    loadingTitle: 'Redirecting to SIMKL',
    loadingBody: 'You will be sent to SIMKL to approve access, then Crispy tv will bring you right back.',
    errorMessage: 'Unable to finish SIMKL authorization.',
  },
} satisfies Record<SyncService, { name: string; logo: string; loadingTitle: string; loadingBody: string; errorMessage: string }>;

function normalizeReturnTo(value: string | null): string {
  return value && value.startsWith('/') ? value : '/auth/onboarding';
}

export default function ProviderConnect() {
  const location = useLocation();
  const navigate = useNavigate();
  const { provider: routeProvider } = useParams();
  const [searchParams] = useSearchParams();
  const { user, householdId, refreshOnboarding } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeFlowRef = useRef<string | null>(null);

  const provider: SyncService | null = routeProvider === 'trakt' || routeProvider === 'simkl' ? routeProvider : null;
  const targetProfileId = searchParams.get('targetProfileId')?.trim() || null;
  const returnTo = normalizeReturnTo(searchParams.get('returnTo'));
  const callbackQuery = searchParams.toString();
  const callbackSearchParams = useMemo(() => new URLSearchParams(callbackQuery), [callbackQuery]);
  const hasCallbackPayload = callbackSearchParams.has('code') || callbackSearchParams.has('error');
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
  const loadingTitle = hasCallbackPayload ? `Finalizing ${config?.name ?? 'provider'} connection` : config?.loadingTitle ?? 'Connecting provider';
  const loadingBody = hasCallbackPayload
    ? `Crispy tv is securely saving your ${config?.name ?? 'provider'} authorization and preparing the next step.`
    : config?.loadingBody ?? 'Starting provider authorization.';
  const retryPath = useMemo(() => {
    if (!provider) {
      return returnTo;
    }

    const params = new URLSearchParams({
      returnTo,
    });

    if (targetProfileId) {
      params.set('targetProfileId', targetProfileId);
    }

    return `/auth/connect/${provider}?${params.toString()}`;
  }, [provider, returnTo, targetProfileId]);

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
    if (!provider) {
      return;
    }

    let active = true;
    const flowSignature = `${location.key}:${provider}:${callbackQuery}:${targetProfileId ?? ''}:${returnTo}`;

    if (activeFlowRef.current === flowSignature) {
      return;
    }

    activeFlowRef.current = flowSignature;

    void (async () => {
      try {
        setBusy(true);
        setError(null);

        if (provider === 'trakt' && hasCallbackPayload) {
          const result = await completeTraktAuthCallback(callbackSearchParams);

          if (!active) {
            return;
          }

          await finishConnection('trakt', result.auth, result.targetProfileId, result.returnTo);
          return;
        }

        if (provider === 'simkl' && hasCallbackPayload) {
          const result = await completeSimklAuthCallback(callbackSearchParams);

          if (!active) {
            return;
          }

          await finishConnection('simkl', result.auth, result.targetProfileId, result.returnTo);
          return;
        }

        if (provider === 'trakt') {
          await beginTraktAuth({
            targetProfileId: targetProfileId ?? undefined,
            returnTo,
          });
          return;
        }

        await beginSimklAuth({
          targetProfileId: targetProfileId ?? undefined,
          returnTo,
        });
      } catch (nextError) {
        clearPendingProviderAuth();

        if (active) {
          activeFlowRef.current = null;
          setError(toErrorMessage(nextError, providerConfig[provider].errorMessage));
          setBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [callbackSearchParams, callbackQuery, finishConnection, hasCallbackPayload, location.key, provider, returnTo, targetProfileId]);

  const handleCancel = () => {
    clearPendingProviderAuth();

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
          <h1 className="text-3xl font-bold tracking-tight text-white">{loadingTitle}</h1>
        </div>
      </div>

      <p className="text-base leading-7 text-stone-300">{loadingBody}</p>

      {provider === 'trakt' ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center">
          {error ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
              <Button onClick={() => navigate(retryPath, { replace: true })}>
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
        <div className="rounded-3xl border border-sky-500/20 bg-sky-500/10 p-6 text-center">
          {error ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
              <Button onClick={() => navigate(retryPath, { replace: true })}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-300" />
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-left text-sm text-emerald-100">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>SIMKL uses a full OAuth redirect now, so approval returns to this callback route without the manual PIN step.</p>
                </div>
              </div>
              <p className="text-sm text-stone-300">Waiting for SIMKL to complete the authorization handshake.</p>
              <a
                href="https://simkl.com/settings/connected-apps/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center text-sm font-semibold text-sky-200 transition hover:text-white"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage SIMKL connected apps
              </a>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex justify-start">
        <Button variant="ghost" onClick={handleCancel} disabled={busy}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {backLabel}
        </Button>
      </div>
    </div>
  );
}
