import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { AppBootScreen } from './components/AppBootScreen';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { Skeleton } from './components/ui/Skeleton';

const AuthLayout = lazy(() => import('./layouts/AuthLayout'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Onboarding = lazy(() => import('./pages/auth/Onboarding'));
const ProviderConnect = lazy(() => import('./pages/auth/ProviderConnect'));
const ProfileList = lazy(() => import('./pages/dashboard/ProfileList'));
const AccountSettings = lazy(() => import('./pages/dashboard/AccountSettings'));
const Addons = lazy(() => import('./pages/dashboard/Addons'));
const Downloads = lazy(() => import('./pages/dashboard/Downloads'));

function renderSuspense(node: ReactNode, fallback: ReactNode) {
  return <Suspense fallback={fallback}>{node}</Suspense>;
}

function AuthRouteFallback() {
  return (
    <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-black/35 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      <div className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function DashboardRouteFallback() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="hidden h-10 w-36 rounded-full md:block" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-3xl border border-white/8 bg-white/[0.03] p-5 md:p-6">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <Skeleton className="h-5 w-32" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
          </div>

          <div className="rounded-3xl border border-white/8 bg-white/[0.03] p-5">
            <Skeleton className="h-5 w-28" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/auth"
            element={renderSuspense(
              <AuthLayout />,
              <AppBootScreen
                title="Loading your auth flow"
                message="We are preparing the sign-in experience and restoring the next step for your account."
              />,
            )}
          >
            <Route path="login" element={renderSuspense(<Login />, <AuthRouteFallback />)} />
            <Route path="signup" element={renderSuspense(<Signup />, <AuthRouteFallback />)} />
            <Route path="onboarding" element={renderSuspense(<Onboarding />, <AuthRouteFallback />)} />
            <Route path="connect/:provider" element={renderSuspense(<ProviderConnect />, <AuthRouteFallback />)} />
            <Route index element={<Navigate to="/auth/login" replace />} />
          </Route>

          <Route
            path="/dashboard"
            element={renderSuspense(
              <DashboardLayout />,
              <AppBootScreen
                title="Loading your dashboard"
                message="We are preparing the dashboard shell and only loading the route you need."
              />,
            )}
          >
            <Route index element={renderSuspense(<ProfileList />, <DashboardRouteFallback />)} />
            <Route path="account" element={renderSuspense(<AccountSettings />, <DashboardRouteFallback />)} />
            <Route path="addons" element={renderSuspense(<Addons />, <DashboardRouteFallback />)} />
            <Route path="downloads" element={renderSuspense(<Downloads />, <DashboardRouteFallback />)} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
