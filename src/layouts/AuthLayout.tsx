import { Navigate, Outlet, useLocation } from 'react-router-dom';
import logoWordmark from '../assets/logo-wordmark.svg';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthLayout() {
  const { user, status, onboardingStatus, error, clearError, initialize } = useAuthStore();
  const location = useLocation();
  const isSignupRoute = location.pathname === '/auth/signup';
  const isOnboardingRoute = location.pathname === '/auth/onboarding';

  if (status === 'booting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-white" />
      </div>
    );
  }

  if (status === 'authenticated' && user && !isOnboardingRoute) {
    return <Navigate to={onboardingStatus === 'required' ? '/auth/onboarding' : '/dashboard'} replace />;
  }

  if (status === 'anonymous' && isOnboardingRoute) {
    return <Navigate to="/auth/login" replace />;
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 p-4 text-white">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-stone-700 bg-stone-800 p-6">
          <h1 className="text-xl font-semibold">Unable to load auth state</h1>
          <p className="text-sm text-stone-300">{error ?? 'Please retry to continue.'}</p>
          <div className="flex gap-3">
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

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-stone-950 text-white selection:bg-white/10">
      {/* Background Layer */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{ backgroundImage: 'url(/auth-signup-backdrop.jpg)' }}
      />
      <div className="fixed inset-0 bg-gradient-to-tr from-stone-950 via-stone-950/80 to-stone-900/40" />
      <div className="fixed inset-0 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="px-6 py-8 sm:px-10 lg:px-12">
          <img src={logoWordmark} alt="Crispy tv" className="h-10 w-auto sm:h-12" />
        </header>

        {/* Content */}
        <main className="flex flex-1 items-center px-6 pb-12 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-7xl">
            {isSignupRoute ? (
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
                <div className="max-w-2xl space-y-6 lg:space-y-8">
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                    Streaming companion
                  </div>
                  <div className="space-y-4 lg:space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-7xl lg:leading-[1.1]">
                      Bring your lists and AI setup together.
                    </h1>
                    <p className="max-w-lg text-lg leading-relaxed text-stone-300 sm:text-xl">
                      Create your Crispy tv account, pick Trakt or SIMKL, then add an OpenRouter key if you want AI-powered
                      recommendations.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['Trakt or SIMKL', 'Optional OpenRouter', 'Start watching faster'].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/5 bg-white/5 px-4 py-1.5 text-sm font-medium text-stone-300 backdrop-blur-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center lg:justify-end">
                  <div className="w-full max-w-lg">
                    <Outlet />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className={`w-full ${location.pathname === '/auth/onboarding' ? 'max-w-4xl' : 'max-w-md'}`}>
                  <Outlet />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
