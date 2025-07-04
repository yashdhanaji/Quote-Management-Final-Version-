import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/authStore';
import { isSupabaseConfigured } from './lib/supabase';
import { Layout } from './components/layout/Layout';
import { LoginForm } from './components/auth/LoginForm';
import { SignupForm } from './components/auth/SignupForm';
import { OrganizationSelector } from './components/auth/OrganizationSelector';
import { Dashboard } from './pages/Dashboard';
import { Quotes } from './pages/Quotes';
import { Products } from './pages/Products';
import { Clients } from './pages/Clients';
import { Team } from './pages/Team';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { SetupPage } from './components/setup/SetupPage';

const queryClient = new QueryClient();

function App() {
  const { user, organization, userOrganizations, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  // Show setup page if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return <SetupPage />;
  }

  // Show auth forms if user is not logged in
  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    );
  }

  // Show organization selector if user has multiple organizations but none selected
  if (userOrganizations.length > 1 && !organization) {
    return (
      <QueryClientProvider client={queryClient}>
        <OrganizationSelector />
      </QueryClientProvider>
    );
  }

  // Show organization selector if user has no organizations
  if (userOrganizations.length === 0) {
    return (
      <QueryClientProvider client={queryClient}>
        <OrganizationSelector />
      </QueryClientProvider>
    );
  }

  // Show main app if user is logged in and has selected an organization
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/quotes" element={<Quotes />} />
            <Route path="/products" element={<Products />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/analytics" element={<div className="p-8 text-center text-gray-500">Analytics page coming soon...</div>} />
            <Route path="/team" element={<Team />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  );
}

export default App;