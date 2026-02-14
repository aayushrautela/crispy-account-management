import { Navigate, Outlet } from 'react-router-dom';
import logo from '../assets/logo.svg';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/useAuthStore';

export default function AuthLayout() {
  const { user, status, error, clearError, initialize } = useAuthStore();

  if (status === 'booting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-white" />
      </div>
    );
  }

  if (status === 'authenticated' && user) {
    return <Navigate to="/dashboard" replace />;
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
    <div
      className="relative flex min-h-screen flex-col bg-cover bg-center bg-no-repeat p-4 text-white"
      style={{ backgroundImage: 'url(/backdrop.png)' }}
    >
      <div className="absolute inset-0 bg-stone-900/80" />

      <div className="relative z-10 flex items-center gap-3">
        <img src={logo} alt="Crispy" className="h-10 w-10" />
        <h1 className="text-2xl font-black tracking-tight text-white">Crispy</h1>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-start pt-[10vh]">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
