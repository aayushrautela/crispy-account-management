import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ProfileList from './pages/dashboard/ProfileList';
import AccountSettings from './pages/dashboard/AccountSettings';
import Downloads from './pages/dashboard/Downloads';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route index element={<Navigate to="/auth/login" replace />} />
          </Route>

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<ProfileList />} />
            <Route path="account" element={<AccountSettings />} />
            <Route path="downloads" element={<Downloads />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
