import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { TravelDataProvider } from './context/TravelDataContext';
import { AppLayout } from './components/layout/AppLayout';

import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import TravelCopilot from './pages/TravelCopilot';
import Destinations from './pages/Destinations';
import ItineraryPlanner from './pages/ItineraryPlanner';
import FlightSearch from './pages/FlightSearch';
import HotelSearch from './pages/HotelSearch';
import BudgetOptimizer from './pages/BudgetOptimizer';
import MyTrips from './pages/MyTrips';
import JourneyRecovery from './pages/JourneyRecovery';
import History from './pages/History';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

export default function App() {
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <ErrorBoundary>
      <APIProvider apiKey={mapsApiKey} language="en" region="US">
        <ToastProvider>
          <AuthProvider>
            <TravelDataProvider>
              <BrowserRouter>
                {mapsQuotaExceeded && (
                  <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
                    <span>
                      Google Maps Platform quota reached. If you are the app owner, visit{' '}
                      <a
                        href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-semibold text-amber-950 hover:text-amber-800"
                      >
                        maps developer site
                      </a>{' '}
                      for instructions to update your account.
                    </span>
                  </div>
                )}

                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />

                  <Route
                    path="/dashboard"
                    element={
                      <AppLayout>
                        <Dashboard />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/copilot"
                    element={
                      <AppLayout>
                        <TravelCopilot />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/destinations"
                    element={
                      <AppLayout>
                        <Destinations />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/planner"
                    element={
                      <AppLayout>
                        <ItineraryPlanner />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/flights"
                    element={
                      <AppLayout>
                        <FlightSearch />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/hotels"
                    element={
                      <AppLayout>
                        <HotelSearch />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/budget"
                    element={
                      <AppLayout>
                        <BudgetOptimizer />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/trips"
                    element={
                      <AppLayout>
                        <MyTrips />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/recovery"
                    element={
                      <AppLayout>
                        <JourneyRecovery />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/history"
                    element={
                      <AppLayout>
                        <History />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <AppLayout>
                        <Profile />
                      </AppLayout>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <AppLayout>
                        <Settings />
                      </AppLayout>
                    }
                  />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </BrowserRouter>
            </TravelDataProvider>
          </AuthProvider>
        </ToastProvider>
      </APIProvider>
    </ErrorBoundary>
  );
}
