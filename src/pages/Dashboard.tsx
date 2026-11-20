import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarRange,
  Compass,
  Plane,
  Building2,
  Wallet,
  Briefcase,
  Search,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTravelData } from '../context/TravelDataContext';
import { DESTINATIONS_CATALOG } from '../data/destinations';
import { formatCurrency } from '../utils/currency';
import { PlacesAutocompleteInput } from '../components/maps/PlacesAutocompleteInput';
import { SafeImage } from '../components/common/SafeImage';

export default function Dashboard() {
  const { profileName } = useAuth();
  const { trips, preferences, loadingData } = useTravelData();
  const navigate = useNavigate();

  const [copilotInput, setCopilotInput] = useState('');
  const [origin, setOrigin] = useState('Chennai');
  const [destination, setDestination] = useState('Goa');
  const [departureDate, setDepartureDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [returnDate, setReturnDate] = useState(
    new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10)
  );
  const [travellers, setTravellers] = useState(2);
  const [budget, setBudget] = useState(40000);
  const [travelPref, setTravelPref] = useState('Beaches & Adventure');

  const handleCopilotLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotInput.trim()) {
      navigate('/copilot');
      return;
    }
    navigate('/copilot', { state: { initialPrompt: copilotInput.trim() } });
  };

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/planner', {
      state: {
        prefill: {
          origin,
          destination,
          departureDate,
          returnDate,
          travellers,
          budget,
          travelStyle: travelPref,
          currency: preferences.currency,
        },
        autoGenerate: true,
      },
    });
  };

  const upcomingTrips = trips.filter((t) => t.status === 'upcoming' || t.status === 'planned');
  const totalEstimatedSpend = trips.reduce((sum, t) => sum + (Number(t.budget) || 0), 0);
  const uniqueDestinationsCount = new Set(trips.map((t) => t.destination.trim().toLowerCase())).size;

  const quickActions = [
    { label: 'Plan a Trip', to: '/planner', icon: CalendarRange },
    { label: 'Explore Destinations', to: '/destinations', icon: Compass },
    { label: 'Compare Flights', to: '/flights', icon: Plane },
    { label: 'Find Hotels', to: '/hotels', icon: Building2 },
    { label: 'Optimise Budget', to: '/budget', icon: Wallet },
    { label: 'Manage Trips', to: '/trips', icon: Briefcase },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Prominent AI Travel Assistant Input */}
      <section className="bg-[#10243A] text-white rounded-2xl p-6 sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-medium text-[#32C6B5]">Agentic Travel Command Center</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Welcome back, {profileName === 'Traveller' ? 'Traveller' : profileName}!
          </h2>
          <p className="text-sm text-slate-300 mt-2">
            Launch our 7-agent travel orchestrator directly or refine a saved trip below.
          </p>

          <form onSubmit={handleCopilotLaunch} className="mt-5 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={copilotInput}
                onChange={(e) => setCopilotInput(e.target.value)}
                placeholder="Where would you like to explore next?"
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-[#182B3A] text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#32C6B5]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 rounded-lg bg-[#32C6B5] text-[#10243A] text-sm font-semibold hover:bg-[#2bb4a4] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              Ask Copilot
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </section>

      {/* Travel Statistics */}
      <section aria-label="Travel Statistics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Total Trips Planned</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-2">
            {trips.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Destinations Explored</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-2">
            {uniqueDestinationsCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Planned Travel Spend</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-2">
            {formatCurrency(totalEstimatedSpend, preferences.currency)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500 font-medium">Saved Itineraries</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-2">
            {trips.filter((t) => t.itinerary.length > 0).length}
          </p>
        </div>
      </section>

      {/* Quick Travel Search */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-base font-semibold text-[#10243A]">Quick Travel Search</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter trip parameters to launch automated multi-agent itinerary generation
            </p>
          </div>
        </div>

        <form onSubmit={handleQuickSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Starting Location</label>
            <PlacesAutocompleteInput
              value={origin}
              onChange={setOrigin}
              placeholder="e.g. Chennai"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Destination</label>
            <PlacesAutocompleteInput
              value={destination}
              onChange={setDestination}
              placeholder="e.g. Goa"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Departure Date</label>
            <input
              type="date"
              required
              value={departureDate}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Return Date</label>
            <input
              type="date"
              required
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Travellers</label>
            <input
              type="number"
              min={1}
              max={20}
              required
              value={travellers}
              onChange={(e) => setTravellers(Number(e.target.value) || 1)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Total Budget ({preferences.currency})
            </label>
            <input
              type="number"
              min={100}
              required
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value) || 1000)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Travel Preferences</label>
            <select
              value={travelPref}
              onChange={(e) => setTravelPref(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
            >
              <option value="Beaches & Adventure">Beaches & Adventure</option>
              <option value="Cultural & Historical">Cultural & Historical</option>
              <option value="Nature & Wellness">Nature & Wellness</option>
              <option value="Family Vacation">Family Vacation</option>
              <option value="Honeymoon & Luxury">Honeymoon & Luxury</option>
              <option value="Budget Backpacking">Budget Backpacking</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Search className="w-4 h-4" />
              Generate Plan
            </button>
          </div>
        </form>
      </section>

      {/* Quick Actions */}
      <section>
        <h3 className="text-base font-semibold text-[#10243A] mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <Link
                key={act.to}
                to={act.to}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-[#247BA0] transition-colors flex flex-col items-start gap-2.5"
              >
                <Icon className="w-5 h-5 text-[#247BA0]" />
                <span className="text-xs font-semibold text-[#10243A] whitespace-nowrap">
                  {act.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Upcoming Trips & Recommended Destinations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#10243A]">Upcoming & Planned Trips</h3>
            <Link to="/trips" className="text-xs font-semibold text-[#247BA0] hover:underline">
              View All
            </Link>
          </div>

          {loadingData ? (
            <div className="space-y-3">
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
            </div>
          ) : upcomingTrips.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-600">No upcoming trips yet.</p>
              <Link
                to="/planner"
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10243A] text-white text-xs font-semibold"
              >
                Plan First Trip
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingTrips.slice(0, 4).map((trip) => (
                <div key={trip.tripId} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#10243A] truncate">
                      {trip.origin} → {trip.destination}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {trip.departureDate} – {trip.returnDate} · {trip.travellers} traveller(s)
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold font-mono tabular-nums text-[#10243A]">
                      {formatCurrency(trip.budget, trip.currency)}
                    </p>
                    <Link
                      to="/trips"
                      className="text-xs font-medium text-[#247BA0] hover:underline"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#10243A]">Recommended Destinations</h3>
            <Link to="/destinations" className="text-xs font-semibold text-[#247BA0] hover:underline">
              Explore All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DESTINATIONS_CATALOG.slice(0, 4).map((dest) => (
              <Link
                key={dest.id}
                to="/destinations"
                state={{ selectedId: dest.id }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#247BA0] transition-colors flex flex-col"
              >
                <div className="h-36 overflow-hidden">
                  <SafeImage
                    src={dest.imageUrl}
                    alt={`${dest.name}, ${dest.country}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-[#10243A]">
                      {dest.name}, {dest.country}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {dest.bestSeason} · Est.{' '}
                      <span className="font-mono tabular-nums">
                        {formatCurrency(
                          preferences.currency === 'USD' ? dest.estimatedBudgetUSD : dest.estimatedBudgetINR,
                          preferences.currency === 'USD' ? 'USD' : 'INR'
                        )}
                      </span>
                    </p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {dest.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
