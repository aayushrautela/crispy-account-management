import { create } from 'zustand';
import type { Session, Subscription, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ensureHouseholdMembership } from '../services/householdService';
import { StorageService } from '../lib/storage';
import { toErrorMessage } from '../lib/errors';
import type { HouseholdRole } from '../types';

export type AuthStatus = 'booting' | 'authenticated' | 'anonymous' | 'error';

interface AuthState {
  session: Session | null;
  user: User | null;
  householdId: string | null;
  membershipRole: HouseholdRole | null;
  status: AuthStatus;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refreshMembership: () => Promise<void>;
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

      if (currentToken !== syncToken) {
        return;
      }

      StorageService.setActiveHouseholdId(membership.household_id);
      set({
        session,
        user: session.user,
        householdId: membership.household_id,
        membershipRole: membership.role,
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

  return {
    session: null,
    user: null,
    householdId: null,
    membershipRole: null,
    status: 'booting',
    loading: true,
    error: null,
    initialize,
    refreshMembership,
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
