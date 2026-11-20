import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Compass,
  CalendarRange,
  Plane,
  Building2,
  Wallet,
  Briefcase,
  ShieldAlert,
  History,
  User,
  Settings,
  Menu,
  X,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/copilot', label: 'AI Travel Copilot', icon: MessageSquare },
  { to: '/destinations', label: 'Destination Explorer', icon: Compass },
  { to: '/planner', label: 'AI Itinerary Planner', icon: CalendarRange },
  { to: '/flights', label: 'Flight Search', icon: Plane },
  { to: '/hotels', label: 'Hotel Search', icon: Building2 },
  { to: '/budget', label: 'Budget Optimizer', icon: Wallet },
  { to: '/trips', label: 'My Trips', icon: Briefcase },
  { to: '/recovery', label: 'Journey Recovery', icon: ShieldAlert },
  { to: '/history', label: 'Assistant History', icon: History },
  { to: '/profile', label: 'User Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isCloudSynced, profileName, signOut } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const currentNav = NAV_ITEMS.find((item) => location.pathname.startsWith(item.to));
  const pageTitle = currentNav?.label || 'Workspace';

  const handleLogout = async () => {
    try {
      await signOut();
      showToast('Signed out', 'Switched to local demo workspace.', 'info');
      navigate('/');
    } catch {
      showToast('Sign out failed', 'Please try again.', 'error');
    }
  };

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#10243A] text-white">
      <div className="px-5 h-16 flex items-center justify-between border-b border-white/10 shrink-0">
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          VoyageMind AI
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 text-slate-300 hover:text-white rounded-lg"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Workspace navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#247BA0]/30 text-[#32C6B5]'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{profileName}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {isCloudSynced ? 'Firestore Cloud Sync' : 'Local Demo Workspace'}
            </p>
          </div>
          {user ? (
            <button
              type="button"
              onClick={handleLogout}
              title="Sign out"
              className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          ) : (
            <Link
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold hover:bg-[#2ab3a3] transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">{SidebarContent}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[#10243A] hover:bg-slate-100 rounded-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <Link to="/dashboard" className="text-slate-500 hover:text-[#10243A] hidden sm:inline">
                VoyageMind AI
              </Link>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">/</span>
              <h1 className="font-semibold text-[#10243A] truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/planner"
              className="px-4 py-2 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756] transition-colors whitespace-nowrap shrink-0"
            >
              New Trip Plan
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
