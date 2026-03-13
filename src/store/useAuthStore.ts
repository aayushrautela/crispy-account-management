import { create } from 'zustand';
import type { Session, Subscription, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ensureHouseholdMembership } from '../services/householdService';
import { getOnboardingState, type OnboardingStatus, type SyncService } from '../services/onboardingService';
import { StorageService } from '../lib/storage';
import { toErrorMessage } from '../lib/errors';
import type { HouseholdRole } from '../types';

export type AuthStatus = 'authenticated' | 'anonymous' | 'error';

interface AuthState {
  session: Session | null;
  user: User | null;
  householdId: string | null;
  membershipRole: HouseholdRole | null;
  onboardingStatus: OnboardingStatus;
  onboardingProfileId: string | null;
  selectedSyncService: SyncService | null;
  connectedSyncService: SyncService | null;
  status: AuthStatus;
  hasInitialized: boolean;
  isInitializing: boolean;
  isRefreshingMembership: boolean;
  isRefreshingOnboarding: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refreshMembership: () => Promise<void>;
  refreshOnboarding: () => Promise<void>;
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
      householdId: null,
      membershipRole: null,
      onboardingStatus: 'unknown',
      onboardingProfileId: null,
      selectedSyncService: null,
      connectedSyncService: null,
      status: 'anonymous',
      hasInitialized: true,
      isInitializing: false,
      isRefreshingMembership: false,
      isRefreshingOnboarding: false,
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
      const membership = await ensureHouseholdMembership(session.user.id);
      const onboarding = await getOnboardingState({
        householdId: membership.household_id,
        userId: session.user.id,
      });

      if (currentToken !== syncToken) {
        return;
      }

      StorageService.setActiveHouseholdId(membership.household_id);
      set({
        session,
        user: session.user,
        householdId: membership.household_id,
        membershipRole: membership.role,
        onboardingStatus: onboarding.status,
        onboardingProfileId: onboarding.profileId,
        selectedSyncService: onboarding.selectedService,
        connectedSyncService: onboarding.connectedService,
        status: 'authenticated',
        hasInitialized: true,
        isInitializing: false,
        isRefreshingMembership: false,
        isRefreshingOnboarding: false,
        error: null,
      });
    } catch (error) {
      if (currentToken !== syncToken) {
        return;
      }

      set({
        session,
        user: session.user,
        householdId: null,
        membershipRole: null,
        onboardingStatus: 'unknown',
        onboardingProfileId: null,
        selectedSyncService: null,
        connectedSyncService: null,
        status: 'error',
        hasInitialized: true,
        isInitializing: false,
        isRefreshingMembership: false,
        isRefreshingOnboarding: false,
        error: toErrorMessage(error, 'Unable to initialize account membership.'),
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
          isRefreshingMembership: false,
          isRefreshingOnboarding: false,
          error: toErrorMessage(error, 'Unable to initialize auth session.'),
        });
      } finally {
        initializePromise = null;
      }
    })();

    return initializePromise;
  };

  const refreshMembership = async (): Promise<void> => {
    const { user, session } = get();

    if (!user || !session) {
      setAnonymous();
      return;
    }

    set({ isRefreshingMembership: true, error: null });
    await syncSession(session);
  };

  const refreshOnboarding = async (): Promise<void> => {
    const { user, householdId } = get();

    if (!user || !householdId) {
      setAnonymous();
      return;
    }

    try {
      set({ isRefreshingOnboarding: true, error: null });
      const onboarding = await getOnboardingState({
        householdId,
        userId: user.id,
      });

      set({
        onboardingStatus: onboarding.status,
        onboardingProfileId: onboarding.profileId,
        selectedSyncService: onboarding.selectedService,
        connectedSyncService: onboarding.connectedService,
        isRefreshingOnboarding: false,
      });
    } catch (error) {
      set({
        status: 'error',
        hasInitialized: true,
        isInitializing: false,
        isRefreshingMembership: false,
        isRefreshingOnboarding: false,
        error: toErrorMessage(error, 'Unable to refresh onboarding status.'),
      });
    }
  };

  return {
    session: null,
    user: null,
    householdId: null,
    membershipRole: null,
    onboardingStatus: 'unknown',
    onboardingProfileId: null,
    selectedSyncService: null,
    connectedSyncService: null,
    status: 'anonymous',
    hasInitialized: false,
    isInitializing: true,
    isRefreshingMembership: false,
    isRefreshingOnboarding: false,
    error: null,
    initialize,
    refreshMembership,
    refreshOnboarding,
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
