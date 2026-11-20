import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CalendarRange,
  Download,
  BookmarkPlus,
  RefreshCw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  Utensils,
} from 'lucide-react';
import {
  AgentTraceStep,
  CurrencyCode,
  ItineraryActivity,
  ItineraryDay,
  TripRecord,
} from '../types/travel';
import {
  generateItineraryApi,
  regenerateItineraryDayApi,
  streamPlanTrip,
} from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { exportTripToPdf } from '../utils/pdfExport';
import { PlacesAutocompleteInput } from '../components/maps/PlacesAutocompleteInput';
import { InteractiveTravelMap } from '../components/maps/InteractiveTravelMap';
import { AgentExecutionPanel } from '../components/agents/AgentExecutionPanel';

const INTEREST_OPTIONS = [
  'Beaches',
  'Adventure',
  'Historical',
  'Cultural',
  'Local Cuisine',
  'Nightlife',
  'Nature',
  'Shopping',
];

export default function ItineraryPlanner() {
  const location = useLocation();
  const { user } = useAuth();
  const { saveTrip, preferences } = useTravelData();
  const { showToast } = useToast();

  const [origin, setOrigin] = useState('Chennai');
  const [destination, setDestination] = useState('Goa');
  const [departureDate, setDepartureDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [returnDate, setReturnDate] = useState(
    new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10)
  );
  const [travellers, setTravellers] = useState(4);
  const [budget, setBudget] = useState(40000);
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency || 'INR');
  const [travelStyle, setTravelStyle] = useState('Adventure & Beaches');
  const [interests, setInterests] = useState<string[]>(['Beaches', 'Adventure', 'Nightlife']);
  const [accommodationPref, setAccommodationPref] = useState('Boutique Hotel');
  const [transportPref, setTransportPref] = useState('Scooter & Local Cabs');

  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [agentTrace, setAgentTrace] = useState<AgentTraceStep[]>([]);
  const [generating, setGenerating] = useState(false);
  const [regeneratingDay, setRegeneratingDay] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Add Activity inline form state
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [newActTitle, setNewActTitle] = useState('');
  const [newActLocation, setNewActLocation] = useState('');
  const [newActSlot, setNewActSlot] = useState<'morning' | 'afternoon' | 'evening'>('afternoon');
  const [newActCost, setNewActCost] = useState(500);

  const requestedDaysCount = useMemo(() => {
    const d1 = new Date(departureDate);
    const d2 = new Date(returnDate);
    if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 4;
    return Math.max(1, Math.min(14, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1));
  }, [departureDate, returnDate]);

  useEffect(() => {
    const state = location.state as {
      prefill?: Partial<{
        origin: string;
        destination: string;
        departureDate: string;
        returnDate: string;
        travellers: number;
        budget: number;
        currency: CurrencyCode;
        travelStyle: string;
      }>;
      loadedItinerary?: ItineraryDay[];
      existingTripId?: string;
      autoGenerate?: boolean;
    } | null;

    if (state?.prefill) {
      if (state.prefill.origin) setOrigin(state.prefill.origin);
      if (state.prefill.destination) setDestination(state.prefill.destination);
      if (state.prefill.departureDate) setDepartureDate(state.prefill.departureDate);
      if (state.prefill.returnDate) setReturnDate(state.prefill.returnDate);
      if (state.prefill.travellers) setTravellers(state.prefill.travellers);
      if (state.prefill.budget) setBudget(state.prefill.budget);
      if (state.prefill.currency) setCurrency(state.prefill.currency);
      if (state.prefill.travelStyle) setTravelStyle(state.prefill.travelStyle);
    }
    if (state?.loadedItinerary) {
      setItinerary(state.loadedItinerary);
    }
    if (state?.autoGenerate && state.prefill?.destination) {
      void runFullGeneration(
        state.prefill.origin || origin,
        state.prefill.destination,
        state.prefill.departureDate || departureDate,
        state.prefill.returnDate || returnDate,
        state.prefill.travellers || travellers,
        state.prefill.budget || budget,
        state.prefill.currency || currency
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const runFullGeneration = async (
    org = origin,
    dest = destination,
    dep = departureDate,
    ret = returnDate,
    trav = travellers,
    bud = budget,
    curr = currency
  ) => {
    if (!org.trim() || !dest.trim()) {
      showToast('Missing Location', 'Please enter both starting location and destination.', 'warning');
      return;
    }
    setGenerating(true);
    setAgentTrace([]);
    try {
      const prompt = `Plan a ${requestedDaysCount}-day trip from ${org} to ${dest} for ${trav} travellers with total budget ${bud} ${curr}. Style: ${travelStyle}. Interests: ${interests.join(', ')}.`;
      const plan = await streamPlanTrip(
        prompt,
        {
          origin: org,
          destination: dest,
          days: requestedDaysCount,
          departureDate: dep,
          returnDate: ret,
          travellers: trav,
          budget: bud,
          currency: curr,
          travelStyle,
          preferences: interests,
          accommodationPreference: accommodationPref,
          transportationPreference: transportPref,
        },
        (steps) => setAgentTrace(steps)
      );
      setItinerary(plan.itinerary);
      setAgentTrace(plan.agentTrace);
      showToast(
        'Itinerary Generated',
        `${plan.itinerary.length}-day plan for ${dest} ready to customize.`,
        'success'
      );
    } catch (err) {
      // Fallback to direct itinerary endpoint if stream interrupted
      try {
        const res = await generateItineraryApi({
          origin: org,
          destination: dest,
          departureDate: dep,
          returnDate: ret,
          days: requestedDaysCount,
          travellers: trav,
          budget: bud,
          currency: curr,
          travelStyle,
          preferences: interests,
          accommodationPreference: accommodationPref,
          transportationPreference: transportPref,
        });
        setItinerary(res.itinerary);
        showToast('Itinerary Generated', `${res.daysCount}-day plan ready.`, 'success');
      } catch (innerErr) {
        showToast(
          'Generation Failed',
          innerErr instanceof Error
            ? innerErr.message
            : err instanceof Error
              ? err.message
              : 'Could not generate itinerary.',
          'error'
        );
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateDay = async (dayNumber: number) => {
    setRegeneratingDay(dayNumber);
    const currentDay = itinerary.find((d) => d.day === dayNumber);
    try {
      const res = await regenerateItineraryDayApi({
        origin,
        destination,
        departureDate,
        days: itinerary.length || requestedDaysCount,
        travellers,
        budget,
        currency,
        travelStyle,
        preferences: interests,
        regenerateDayNumber: dayNumber,
        existingTheme: currentDay?.theme,
      });
      setItinerary((prev) => prev.map((d) => (d.day === dayNumber ? res.day : d)));
      showToast(`Day ${dayNumber} Regenerated`, 'Updated with fresh local activities.', 'success');
    } catch (err) {
      showToast(
        'Regeneration Failed',
        err instanceof Error ? err.message : 'Unable to regenerate day.',
        'error'
      );
    } finally {
      setRegeneratingDay(null);
    }
  };

  const handleRemoveActivity = (dayNum: number, actId: string) => {
    setItinerary((prev) =>
      prev.map((d) =>
        d.day === dayNum
          ? {
              ...d,
              activities: d.activities.filter((a) => a.id !== actId),
            }
          : d
      )
    );
  };

  const handleMoveActivity = (dayNum: number, idx: number, dir: -1 | 1) => {
    setItinerary((prev) =>
      prev.map((d) => {
        if (d.day !== dayNum) return d;
        const target = idx + dir;
        if (target < 0 || target >= d.activities.length) return d;
        const copy = [...d.activities];
        const [item] = copy.splice(idx, 1);
        copy.splice(target, 0, item);
        return { ...d, activities: copy };
      })
    );
  };

  const handleAddActivity = (dayNum: number) => {
    if (!newActTitle.trim()) return;
    const newItem: ItineraryActivity = {
      id: `custom_${Date.now()}`,
      timeSlot: newActSlot,
      title: newActTitle.trim(),
      location: newActLocation.trim() || destination,
      description: 'Custom activity added to itinerary.',
      estimatedCost: Number(newActCost) || 0,
      travelTime: '15 mins',
      transportMode: transportPref,
      category: 'Custom',
    };
    setItinerary((prev) =>
      prev.map((d) =>
        d.day === dayNum
          ? {
              ...d,
              activities: [...d.activities, newItem],
              estimatedDayCost: d.estimatedDayCost + newItem.estimatedCost,
            }
          : d
      )
    );
    setAddingToDay(null);
    setNewActTitle('');
    setNewActLocation('');
  };

  const buildTripPayload = (): TripRecord => ({
    tripId: `trip_${Date.now()}`,
    userId: user?.uid || 'demo-local',
    origin,
    destination,
    departureDate,
    returnDate,
    travellers,
    budget,
    currency,
    travelStyle,
    itinerary,
    status: 'planned',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const handleSaveTrip = async () => {
    if (itinerary.length === 0) {
      showToast('Nothing to Save', 'Generate an itinerary first.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await saveTrip(buildTripPayload());
      showToast('Trip Saved', 'Saved to My Trips.', 'success');
    } catch (err) {
      showToast('Save Failed', err instanceof Error ? err.message : 'Unable to save trip.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    if (itinerary.length === 0) {
      showToast('Nothing to Export', 'Generate an itinerary first.', 'warning');
      return;
    }
    exportTripToPdf(buildTripPayload());
    showToast('PDF Downloaded', `Exported ${destination} itinerary.`, 'success');
  };

  const mapMarkers = useMemo(() => {
    const pts: { id: string; title: string; subtitle: string; tag: string; lat: number; lng: number }[] = [];
    for (const d of itinerary) {
      for (const a of d.activities) {
        if (typeof a.lat === 'number' && typeof a.lng === 'number' && !Number.isNaN(a.lat)) {
          pts.push({
            id: a.id,
            title: a.title,
            subtitle: a.location,
            tag: `Day ${d.day} · ${a.timeSlot}`,
            lat: a.lat,
            lng: a.lng,
          });
        }
      }
    }
    return pts;
  }, [itinerary]);

  const mapCenter = mapMarkers[0]
    ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng }
    : { lat: 15.2993, lng: 74.124 };

  return (
    <div className="space-y-6">
      {/* Configuration Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#10243A]">AI Itinerary Planner</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Generates a validated {requestedDaysCount}-day schedule with clustered stops and transit times
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={itinerary.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#10243A] hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={handleSaveTrip}
              disabled={itinerary.length === 0 || saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold hover:bg-[#2bb4a4] disabled:opacity-40 whitespace-nowrap"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Trip'}
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void runFullGeneration();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Starting Location</label>
              <PlacesAutocompleteInput value={origin} onChange={setOrigin} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Destination</label>
              <PlacesAutocompleteInput value={destination} onChange={setDestination} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Departure Date</label>
              <input
                type="date"
                required
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Return Date</label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Travellers</label>
              <input
                type="number"
                min={1}
                max={20}
                value={travellers}
                onChange={(e) => setTravellers(Number(e.target.value) || 1)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Total Budget</label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="px-2.5 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AED">AED</option>
                  <option value="JPY">JPY</option>
                </select>
                <input
                  type="number"
                  min={100}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value) || 1000)}
                  className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Accommodation</label>
              <select
                value={accommodationPref}
                onChange={(e) => setAccommodationPref(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="Hostel & Co-living">Hostel & Co-living</option>
                <option value="Boutique Hotel">Boutique Hotel</option>
                <option value="4-Star Resort">4-Star Resort</option>
                <option value="Luxury Villa">Luxury Villa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Local Transport</label>
              <select
                value={transportPref}
                onChange={(e) => setTransportPref(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="Scooter & Local Cabs">Scooter & Local Cabs</option>
                <option value="Public Transit & Rail">Public Transit & Rail</option>
                <option value="Private Chauffeur Car">Private Chauffeur Car</option>
                <option value="Walking & Metro">Walking & Metro</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-600 mr-1">Interests:</span>
              {INTEREST_OPTIONS.map((item) => {
                const active = interests.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInterest(item)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#247BA0] text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-[#10243A]'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={generating}
              className="px-5 py-2.5 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center gap-2 disabled:opacity-60 whitespace-nowrap"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Coordinating Agents...
                </>
              ) : (
                <>
                  <CalendarRange className="w-4 h-4" />
                  Generate {requestedDaysCount}-Day Itinerary
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {agentTrace.length > 0 && <AgentExecutionPanel steps={agentTrace} />}

      {/* Generated Itinerary + Interactive Route Map */}
      {generating && itinerary.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-4 h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : itinerary.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-5">
            {itinerary.map((day) => (
              <section
                key={day.day}
                className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-[#10243A]">
                      Day {day.day}: {day.theme}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {day.date || 'Scheduled Day'} · Est. Day Spend:{' '}
                      <span className="font-mono tabular-nums font-semibold text-[#10243A]">
                        {formatCurrency(day.estimatedDayCost, currency)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAddingToDay(addingToDay === day.day ? null : day.day)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#10243A] hover:bg-slate-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Activity
                    </button>
                    <button
                      type="button"
                      disabled={regeneratingDay === day.day}
                      onClick={() => void handleRegenerateDay(day.day)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#247BA0] hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${regeneratingDay === day.day ? 'animate-spin' : ''}`}
                      />
                      Regenerate Day
                    </button>
                  </div>
                </div>

                {addingToDay === day.day && (
                  <div className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      placeholder="Activity title"
                      value={newActTitle}
                      onChange={(e) => setNewActTitle(e.target.value)}
                      className="sm:col-span-2 px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Location"
                      value={newActLocation}
                      onChange={(e) => setNewActLocation(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                    <select
                      value={newActSlot}
                      onChange={(e) =>
                        setNewActSlot(e.target.value as 'morning' | 'afternoon' | 'evening')
                      }
                      className="px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="morning">Morning</option>
                      <option value="afternoon">Afternoon</option>
                      <option value="evening">Evening</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Est. Cost"
                      value={newActCost}
                      onChange={(e) => setNewActCost(Number(e.target.value) || 0)}
                      className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddActivity(day.day)}
                      className="sm:col-span-3 py-2 px-3 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756]"
                    >
                      Save Activity to Day {day.day}
                    </button>
                  </div>
                )}

                <div className="divide-y divide-slate-100">
                  {day.activities.map((act, idx) => (
                    <div key={act.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-[#247BA0] uppercase tracking-wide">
                          {act.timeSlot} · {act.travelTime} via {act.transportMode}
                        </p>
                        <h4 className="text-sm font-semibold text-[#10243A] mt-0.5">{act.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{act.location}</p>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{act.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs font-mono tabular-nums font-semibold text-[#10243A]">
                          {formatCurrency(act.estimatedCost, currency)} est.
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveActivity(day.day, idx, -1)}
                            disabled={idx === 0}
                            aria-label="Move activity up"
                            className="p-1 text-slate-400 hover:text-[#10243A] disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveActivity(day.day, idx, 1)}
                            disabled={idx === day.activities.length - 1}
                            aria-label="Move activity down"
                            className="p-1 text-slate-400 hover:text-[#10243A] disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveActivity(day.day, act.id)}
                            aria-label="Remove activity"
                            className="p-1 text-slate-400 hover:text-[#DC2626]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {day.suggestedRestaurants && day.suggestedRestaurants.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#10243A]">
                      <Utensils className="w-3.5 h-3.5 text-[#247BA0]" />
                      Suggested Dining:
                    </span>
                    {day.suggestedRestaurants.map((r, rIdx) => (
                      <span key={rIdx}>
                        {r.name} ({r.cuisine} · {formatCurrency(r.estimatedCost, currency)} est.)
                      </span>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-4">
            <InteractiveTravelMap
              center={mapCenter}
              zoom={11}
              heightClassName="h-[380px]"
              markers={mapMarkers}
            />
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-[#10243A]">Itinerary Map & Estimates</p>
              <p>
                Activity markers reflect clustered locations across your {itinerary.length}-day trip.
                All costs shown are illustrative local estimates.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CalendarRange className="w-8 h-8 text-[#247BA0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#10243A]">Ready to plan your journey</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Configure your origin, destination, dates, and preferences above, then click Generate Itinerary to run our multi-agent planner.
          </p>
        </div>
      )}
    </div>
  );
}
