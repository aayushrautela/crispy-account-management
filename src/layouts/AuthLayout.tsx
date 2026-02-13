import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import logo from '../assets/logo.svg';

export default function AuthLayout() {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div 
      className="min-h-screen text-white flex flex-col p-4 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/backdrop.png)' }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-stone-900/80" />
      
      {/* Logo in top left */}
      <div className="relative z-10 flex items-center gap-3">
        <img src={logo} alt="Crispy" className="w-10 h-10" />
        <h1 className="text-2xl font-black tracking-tight text-white">Crispy</h1>
      </div>

      {/* Main content moved slightly up */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-[10vh]">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
