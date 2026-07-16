import { create } from 'zustand';
import type { Session, Subscription, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getMe } from '../services/meService';
import { getOnboardingState, type OnboardingStatus, type SyncService } from '../services/onboardingService';
import { StorageService } from '../lib/storage';
import { toErrorMessage } from '../lib/errors';

export type AuthStatus = 'authenticated' | 'anonymous' | 'error';

interface AuthState {
  session: Session | null;
  user: User | null;
  accountId: string | null;
  onboardingStatus: OnboardingStatus;
  onboardingProfileId: string | null;
  selectedSyncService: SyncService | null;
  connectedSyncService: SyncService | null;
  status: AuthStatus;
  hasInitialized: boolean;
  isInitializing: boolean;
  isRefreshing: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

let authSubscription: Subscription | null = null;
let initializePromise: Promise<void> | null = null;
let syncToken = 0;

export const useAuthStore = create<AuthState>((set, get) => {
  const setAnonymous = (): void => {
    StorageService.clearAllSessionScope();
    set({
      session: null,
      user: null,
      accountId: null,
      onboardingStatus: 'unknown',
      onboardingProfileId: null,
      selectedSyncService: null,
      connectedSyncService: null,
      status: 'anonymous',
      hasInitialized: true,
      isInitializing: false,
      isRefreshing: false,
      error: null,
    });
  };

  const syncSession = async (session: Session | null): Promise<void> => {
    const currentToken = ++syncToken;

    if (!session?.user) {
      if (currentToken === syncToken) {
        setAnonymous();
      }

      return;
    }

    try {
      const me = await getMe();
      const onboarding = await getOnboardingState();

      if (currentToken !== syncToken) {
        return;
      }

      if (onboarding.profileId) {
        StorageService.setActiveProfileId(onboarding.profileId);
      }

      set({
        session,
        user: session.user,
        accountId: me.user.id,
        onboardingStatus: onboarding.status,
        onboardingProfileId: onboarding.profileId,
        selectedSyncService: onboarding.selectedService,
        connectedSyncService: onboarding.connectedService,
        status: 'authenticated',
        hasInitialized: true,
        isInitializing: false,
        isRefreshing: false,
        error: null,
      });
    } catch (error) {
      if (currentToken !== syncToken) {
        return;
      }

      set({
        session,
        user: session.user,
        accountId: null,
        onboardingStatus: 'unknown',
        onboardingProfileId: null,
        selectedSyncService: null,
        connectedSyncService: null,
        status: 'error',
        hasInitialized: true,
        isInitializing: false,
        isRefreshing: false,
        error: toErrorMessage(error, 'Unable to initialize account.'),
      });
    }
  };

  const initialize = async (): Promise<void> => {
    if (initializePromise) {
      return initializePromise;
    }

    set({ isInitializing: true, error: null });

    initializePromise = (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        await syncSession(session);

        if (!authSubscription) {
          const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            const currentUserId = get().user?.id ?? null;
            const nextUserId = nextSession?.user?.id ?? null;

            if (nextUserId && nextUserId !== currentUserId) {
              set({ isInitializing: true, error: null });
            }

            void syncSession(nextSession);
          });

          authSubscription = data.subscription;
        }
      } catch (error) {
        set({
          status: 'error',
          hasInitialized: true,
          isInitializing: false,
          isRefreshing: false,
          error: toErrorMessage(error, 'Unable to initialize auth session.'),
        });
      } finally {
        initializePromise = null;
      }
    })();

    return initializePromise;
  };

  const refresh = async (): Promise<void> => {
    const { user, session } = get();

    if (!user || !session) {
      setAnonymous();
      return;
    }

    set({ isRefreshing: true, error: null });
    await syncSession(session);
  };

  return {
    session: null,
    user: null,
    accountId: null,
    onboardingStatus: 'unknown',
    onboardingProfileId: null,
    selectedSyncService: null,
    connectedSyncService: null,
    status: 'anonymous',
    hasInitialized: false,
    isInitializing: true,
    isRefreshing: false,
    error: null,
    initialize,
    refresh,
    signOut: async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        set({ error: toErrorMessage(error, 'Unable to sign out cleanly.') });
      } finally {
        setAnonymous();
      }
    },
    clearError: () => set({ error: null }),
  };
});
