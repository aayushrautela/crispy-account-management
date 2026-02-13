import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Settings, LogOut, Smartphone, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import logo from '../assets/logo.svg';

export default function DashboardLayout() {
  const { user, loading, signOut } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-900 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  const navItems = [
    { name: 'Profiles', href: '/dashboard', icon: User },
    { name: 'Account', href: '/dashboard/account', icon: Settings },
    { name: 'Get the app', href: '/dashboard/downloads', icon: Smartphone },
  ];

  return (
    <div className="min-h-screen bg-stone-900 text-stone-50 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-stone-800 border-r border-stone-700">
        <div className="p-6 flex items-center gap-3">
          <img src={logo} alt="Crispy" className="w-10 h-10" />
          <span className="text-2xl font-black tracking-tight">Crispy</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? 'bg-amber-500/10 text-amber-500 shadow-sm shadow-amber-500/5'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "text-stone-500")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800/50">
          <button 
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-stone-800 border-r border-stone-700 transition-transform duration-300 ease-in-out md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center gap-3">
          <img src={logo} alt="Crispy" className="w-10 h-10" />
          <span className="text-2xl font-black tracking-tight">Crispy</span>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-amber-500/10 text-amber-500"
                    : "text-stone-400 hover:bg-stone-800 hover:text-stone-100"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "text-stone-500")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-800">
          <button 
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-stone-900">
        <header className="h-16 flex items-center justify-between px-6 md:px-8 bg-stone-900/80 backdrop-blur-md sticky top-0 z-30 border-b border-stone-800">
          <button 
            className="md:hidden p-2 -ml-2 text-stone-400 hover:text-stone-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1 md:flex-none" />

          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-bold text-stone-300">
               {user?.email?.charAt(0).toUpperCase() || 'A'}
             </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 md:p-10">
                <Outlet />
            </div>
        </div>
      </main>
    </div>
  );
}
