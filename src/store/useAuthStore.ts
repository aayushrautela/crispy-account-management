import { create } from 'zustand';
import type { Session, Subscription, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ensureHouseholdMembership } from '../services/householdService';
import { getOnboardingState, type OnboardingStatus, type SyncService } from '../services/onboardingService';
import { StorageService } from '../lib/storage';
import { toErrorMessage } from '../lib/errors';
import type { HouseholdRole } from '../types';

export type AuthStatus = 'booting' | 'authenticated' | 'anonymous' | 'error';

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
  loading: boolean;
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
        loading: false,
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
        loading: false,
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
        loading: false,
        error: toErrorMessage(error, 'Unable to initialize account membership.'),
      });
    }
  };

  const initialize = async (): Promise<void> => {
    if (initializePromise) {
      return initializePromise;
    }

    set({ status: 'booting', loading: true, error: null });

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
            void syncSession(nextSession);
          });

          authSubscription = data.subscription;
        }
      } catch (error) {
        set({
          status: 'error',
          loading: false,
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

    set({ loading: true, status: 'booting', error: null });
    await syncSession(session);
  };

  const refreshOnboarding = async (): Promise<void> => {
    const { user, householdId } = get();

    if (!user || !householdId) {
      setAnonymous();
      return;
    }

    try {
      set({ loading: true, onboardingStatus: 'unknown', error: null });
      const onboarding = await getOnboardingState({
        householdId,
        userId: user.id,
      });

      set({
        onboardingStatus: onboarding.status,
        onboardingProfileId: onboarding.profileId,
        selectedSyncService: onboarding.selectedService,
        connectedSyncService: onboarding.connectedService,
        loading: false,
      });
    } catch (error) {
      set({
        status: 'error',
        loading: false,
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
    status: 'booting',
    loading: true,
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
