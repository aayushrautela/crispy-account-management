import { Navigate, Outlet, useLocation } from 'react-router-dom';
import logoWordmark from '../assets/logo-wordmark.svg';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthLayout() {
  const { user, status, onboardingStatus, error, clearError, initialize } = useAuthStore();
  const location = useLocation();
  const isSignupRoute = location.pathname === '/auth/signup';
  const isLoginRoute = location.pathname === '/auth/login';
  const isOnboardingRoute = location.pathname === '/auth/onboarding';
  const isProviderRoute = location.pathname.startsWith('/auth/connect/');

  if (status === 'booting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-white" />
      </div>
    );
  }

  if (status === 'authenticated' && user && !isOnboardingRoute && !isProviderRoute) {
    return <Navigate to={onboardingStatus === 'required' ? '/auth/onboarding' : '/dashboard'} replace />;
  }

  if (status === 'anonymous' && (isOnboardingRoute || isProviderRoute)) {
    return <Navigate to="/auth/login" replace />;
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-4 text-white">
        <div className="w-full max-w-md space-y-6 rounded-lg border border-white/5 bg-stone-900 p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Unable to load auth state</h1>
          <p className="text-sm text-stone-400">{error ?? 'Please retry to continue'}</p>
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

  const shouldUseSplitLayout = isSignupRoute || isLoginRoute;

  return (
    <div className="relative flex min-h-screen flex-col bg-stone-950 text-white">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/auth-signup-backdrop.jpg")' }}
      >
        <div className="absolute inset-0 bg-stone-950/70" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <header className="px-6 py-6 sm:px-10 lg:px-12">
          <img src={logoWordmark} alt="Crispy tv" className="h-10 w-auto" />
        </header>

        {/* Content */}
        <main className="flex flex-1 items-center px-6 pb-32 sm:px-10 lg:px-12">
          <div className="mx-auto w-full max-w-7xl">
            {shouldUseSplitLayout ? (
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-24">
                <div className="max-w-2xl space-y-6">
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl lg:leading-[1.1]">
                      Bring your lists and AI setup together.
                    </h1>
                    <p className="max-w-lg text-base leading-relaxed text-stone-300">
                      Create your Crispy tv account, pick Trakt or SIMKL, then add an OpenRouter key if you want AI-powered
                      recommendations.
                    </p>
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
                <div
                  className={`w-full ${
                    isOnboardingRoute ? 'max-w-4xl' : isProviderRoute ? 'max-w-2xl' : 'max-w-md'
                  }`}
                >
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
