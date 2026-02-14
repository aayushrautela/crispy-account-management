import { useState, type ComponentType } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, Settings, Smartphone, User } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import logo from '../assets/logo.svg';

interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Profiles', href: '/dashboard', icon: User },
  { name: 'Account', href: '/dashboard/account', icon: Settings },
  { name: 'Get the app', href: '/dashboard/downloads', icon: Smartphone },
];

interface SidebarContentProps {
  pathname: string;
  onNavigate?: () => void;
  onSignOut: () => Promise<void>;
  signingOut: boolean;
}

function SidebarContent({ pathname, onNavigate, onSignOut, signingOut }: SidebarContentProps) {
  return (
    <>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Crispy" className="h-10 w-10" />
          <span className="text-2xl font-black tracking-tight text-white">Crispy</span>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                isActive
                  ? 'bg-amber-500/10 text-amber-500 shadow-sm shadow-amber-500/10'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100',
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive ? 'text-amber-500' : 'text-stone-500')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-700/70 p-4">
        <Button
          variant="danger"
          onClick={() => {
            void onSignOut();
          }}
          isLoading={signingOut}
          className="w-full"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export default function DashboardLayout() {
  const { user, householdId, status, error, clearError, initialize, signOut } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  if (status === 'booting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-white" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 p-4 text-white">
        <div className="w-full max-w-md rounded-2xl border border-stone-700 bg-stone-800 p-6">
          <h1 className="text-xl font-semibold">Unable to load account</h1>
          <p className="mt-2 text-sm text-stone-300">{error ?? 'Try again to continue.'}</p>
          <div className="mt-4 flex gap-3">
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
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-sm text-stone-300">
        Resolving household context...
      </div>
    );
  }

  const handleSignOut = async (): Promise<void> => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  return (
    <div className="flex min-h-screen bg-stone-900 text-stone-50">
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-stone-700 bg-stone-800 md:flex">
        <SidebarContent
          pathname={location.pathname}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-stone-700 bg-stone-800 transition-transform duration-300 ease-in-out md:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent
          pathname={location.pathname}
          onNavigate={() => setIsMobileMenuOpen(false)}
          onSignOut={handleSignOut}
          signingOut={signingOut}
        />
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-stone-900">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-800 bg-stone-900/80 px-6 backdrop-blur-md md:px-8">
          <button
            aria-label="Open navigation"
            className="-ml-2 p-2 text-stone-400 transition-colors hover:text-stone-100 md:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1 md:flex-none" />

          <div className="flex items-center gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-700 bg-stone-800 text-xs font-bold text-stone-300">
              {user.email?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl p-4 md:p-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
