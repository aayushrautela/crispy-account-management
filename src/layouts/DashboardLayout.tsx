import { useState, type ComponentType } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, Puzzle, Settings, Smartphone, User } from 'lucide-react';
import { AppBootScreen } from '../components/AppBootScreen';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import logoWordmark from '../assets/logo-wordmark.svg';

interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Profiles', href: '/dashboard', icon: User },
  { name: 'Account', href: '/dashboard/account', icon: Settings },
  { name: 'Add-ons', href: '/dashboard/addons', icon: Puzzle },
  { name: 'Downloads', href: '/dashboard/downloads', icon: Smartphone },
];

interface SidebarContentProps {
  pathname: string;
  userEmail: string | undefined;
  onNavigate?: () => void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ pathname, userEmail, onNavigate, onSignOut, signingOut }: SidebarContentProps) {
  return (
    <>
      <div className="border-b border-white/5 px-6 py-6">
        <img src={logoWordmark} alt="Crispy tv" className="h-7 w-auto" />
      </div>

      <nav className="flex-1 space-y-2 px-4 py-5">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-stone-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-[#72a1ff]' : 'text-stone-500')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="mb-4 p-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-semibold text-white">
              {userEmail?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-stone-400">{userEmail ?? 'Signed in'}</p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            void onSignOut();
          }}
          isLoading={signingOut}
          className="w-full justify-center"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}

export default function DashboardLayout() {
  const {
    user,
    householdId,
    onboardingStatus,
    status,
    error,
    clearError,
    hasInitialized,
    initialize,
    isInitializing,
    refreshOnboarding,
    signOut,
  } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (!hasInitialized || isInitializing) {
    return (
      <AppBootScreen
        title="Preparing your dashboard"
        message="We are loading your household access, setup state, and dashboard shell in one pass."
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/5 bg-stone-900 p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white">Unable to load account</h1>
          <p className="mt-2 text-sm text-stone-400">{error ?? 'Try again to continue'}</p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                clearError();
                void initialize();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated' || !user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!householdId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/5 bg-stone-900 p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white">Unable to resolve household access</h1>
          <p className="mt-2 text-sm text-stone-400">Your session loaded, but the household context did not finish syncing.</p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                clearError();
                void initialize();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (onboardingStatus === 'unknown') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4 text-white">
        <div className="w-full max-w-md rounded-lg border border-white/5 bg-stone-900 p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white">Unable to confirm your setup</h1>
          <p className="mt-2 text-sm text-stone-400">We could not finish checking onboarding state for this session.</p>
          <div className="mt-6 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                void refreshOnboarding();
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (onboardingStatus === 'required') {
    return <Navigate to="/auth/onboarding" replace />;
  }

  const currentNavItem = navItems.find((item) => isNavItemActive(location.pathname, item.href));

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <div className="flex min-h-screen bg-[#090b10] text-stone-50">
      <aside className="sticky top-0 hidden h-screen w-60 flex-col border-r border-white/5 bg-stone-900 md:flex">
        <SidebarContent
          pathname={location.pathname}
          userEmail={user.email}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-white/5 bg-stone-900 transition-transform duration-300 ease-in-out md:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent
          pathname={location.pathname}
          userEmail={user.email}
          onNavigate={() => setIsMobileMenuOpen(false)}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-stone-950">
        <header className="sticky top-0 z-30 border-b border-white/5 bg-stone-950/80 px-5 py-4 backdrop-blur-md md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                aria-label="Open navigation"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-stone-300 transition-colors hover:bg-white/[0.08] hover:text-white md:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>

              <div>
                <h1 className="text-sm font-semibold text-white md:text-base">{currentNavItem?.name ?? 'Dashboard'}</h1>
              </div>
            </div>

            <div className="min-w-0 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-stone-300">
              <span className="hidden md:inline">Signed in as </span>
              <span className="font-medium text-white">{user.email}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-8 xl:p-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
