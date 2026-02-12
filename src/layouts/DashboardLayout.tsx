import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { User, Settings, LogOut, Download, Menu, X } from 'lucide-react';
import { cn } from '../lib/utils';
import logo from '../assets/logo.svg';

export default function DashboardLayout() {
  const { user, loading, signOut } = useAuthStore();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
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
    { name: 'Downloads', href: '/dashboard/downloads', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-800">
        <div className="p-6">
          <img src={logo} alt="Crispy" className="h-8 w-auto" />
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors',
                location.pathname === item.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:bg-gray-900 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-red-500 hover:bg-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 md:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar (Drawer) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-gray-800 transition-transform duration-300 md:hidden",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6">
          <img src={logo} alt="Crispy" className="h-8 w-auto" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:bg-gray-900 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={() => signOut()}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-md text-sm font-medium text-red-500 hover:bg-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-gray-800 md:px-8">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsMobileMenuOpen(true)} 
               className="md:hidden p-2 -ml-2 text-gray-400"
             >
               <Menu className="h-6 w-6" />
             </button>
             <img src={logo} alt="Crispy" className="md:hidden h-8 w-auto" />
             <h2 className="hidden md:block text-sm font-medium text-gray-400">
               Dashboard / {navItems.find(i => i.href === location.pathname)?.name || "Overview"}
             </h2>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold">
               {user?.email?.charAt(0).toUpperCase()}
             </div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <Outlet />
            </div>
        </div>
      </main>
    </div>
  );
}
