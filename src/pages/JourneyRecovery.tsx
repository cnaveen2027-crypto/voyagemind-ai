import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShieldAlert,
  Loader2,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  Wallet,
} from 'lucide-react';
import {
  CurrencyCode,
  DisruptionType,
  RecoveryPlanResult,
  TripRecord,
} from '../types/travel';
import { recoverJourneyApi } from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { AgentExecutionPanel } from '../components/agents/AgentExecutionPanel';
import { PlacesAutocompleteInput } from '../components/maps/PlacesAutocompleteInput';

const DISRUPTION_TYPES: { value: DisruptionType; label: string }[] = [
  { value: 'flight_cancellation', label: 'Flight Cancellation' },
  { value: 'flight_delay', label: 'Severe Flight Delay' },
  { value: 'hotel_cancellation', label: 'Hotel Booking Cancellation / Overbooking' },
  { value: 'missed_connection', label: 'Missed Transit Connection' },
  { value: 'weather_disruption', label: 'Severe Weather Disruption' },
  { value: 'budget_change', label: 'Sudden Budget Reduction' },
  { value: 'missed_activity', label: 'Missed Scheduled Activity' },
];

const SCENARIO_PRESETS = [
  {
    label: 'Flight Cancellation (Chennai → Delhi)',
    origin: 'Chennai',
    destination: 'Delhi',
    type: 'flight_cancellation' as DisruptionType,
    details:
      'Morning 06:40 non-stop flight from Chennai to Delhi was cancelled 3 hours prior to departure. Need an immediate same-day alternative and adjusted Day 1 arrival activities.',
    originalCost: 6200,
    originalTime: '06:40 – 09:30',
  },
  {
    label: 'Hotel Overbooking (Goa)',
    origin: 'Chennai',
    destination: 'Goa',
    type: 'hotel_cancellation' as DisruptionType,
    details:
      'Candolim beachfront boutique hotel reported maintenance closure for our 3-night stay. Need a comparable nearby stay within the same nightly budget.',
    originalCost: 4800,
    originalTime: '14:00 Check-in',
  },
  {
    label: 'Weather Disruption (Outdoor Watersports)',
    origin: 'Bengaluru',
    destination: 'Goa',
    type: 'weather_disruption' as DisruptionType,
    details:
      'Coastal squall warning cancelled afternoon parasailing and kayaking at Baga Cove. Need indoor cultural/dining alternatives in Panaji.',
    originalCost: 4200,
    originalTime: '13:30 – 17:00',
  },
];

export default function JourneyRecovery() {
  const location = useLocation();
  const { trips, preferences, saveTrip, recordRecoveryPlan, confirmRecoveryPlan } = useTravelData();
  const { showToast } = useToast();

  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [origin, setOrigin] = useState('Chennai');
  const [destination, setDestination] = useState('Delhi');
  const [disruptionType, setDisruptionType] = useState<DisruptionType>('flight_cancellation');
  const [disruptionDetails, setDisruptionDetails] = useState(
    'Morning 06:40 flight from Chennai to Delhi cancelled before boarding. Need same-day rebooking and adjusted Day 1 schedule.'
  );
  const [originalCost, setOriginalCost] = useState(6200);
  const [originalTime, setOriginalTime] = useState('06:40 – 09:30');
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency || 'INR');

  const [loading, setLoading] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState<RecoveryPlanResult | null>(null);
  const [applying, setApplying] = useState(false);

  const selectedTrip: TripRecord | undefined = useMemo(
    () => trips.find((t) => t.tripId === selectedTripId),
    [trips, selectedTripId]
  );

  useEffect(() => {
    const state = location.state as { trip?: TripRecord } | null;
    if (state?.trip) {
      setSelectedTripId(state.trip.tripId);
      setOrigin(state.trip.origin);
      setDestination(state.trip.destination);
      setCurrency(state.trip.currency);
    }
  }, [location.state]);

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    const found = trips.find((t) => t.tripId === tripId);
    if (found) {
      setOrigin(found.origin);
      setDestination(found.destination);
      setCurrency(found.currency);
    }
  };

  const applyPreset = (preset: (typeof SCENARIO_PRESETS)[number]) => {
    setOrigin(preset.origin);
    setDestination(preset.destination);
    setDisruptionType(preset.type);
    setDisruptionDetails(preset.details);
    setOriginalCost(preset.originalCost);
    setOriginalTime(preset.originalTime);
  };

  const handleAnalyzeDisruption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim() || !disruptionDetails.trim()) {
      showToast('Incomplete Details', 'Provide route and disruption description.', 'warning');
      return;
    }

    setLoading(true);
    setRecoveryPlan(null);
    try {
      const res = await recoverJourneyApi({
        tripId: selectedTripId || `adhoc_${Date.now()}`,
        origin: origin.trim(),
        destination: destination.trim(),
        disruptionType,
        disruptionDetails: disruptionDetails.trim(),
        originalCost: Number(originalCost) || 0,
        originalTime: originalTime.trim() || 'Scheduled',
        currency,
        itinerary: selectedTrip?.itinerary,
      });
      setRecoveryPlan(res);
      void recordRecoveryPlan(res).catch(() => {});
      showToast(
        'Recovery Options Ready',
        'Review the comparison below and confirm before applying changes.',
        'info'
      );
    } catch (err) {
      showToast(
        'Recovery Analysis Failed',
        err instanceof Error ? err.message : 'Unable to generate recovery plan.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPlan = async (decision: 'confirmed' | 'dismissed') => {
    if (!recoveryPlan) return;
    setApplying(true);
    try {
      await confirmRecoveryPlan(recoveryPlan.recoveryId, decision);
      setRecoveryPlan({ ...recoveryPlan, status: decision });

      if (decision === 'confirmed' && selectedTrip) {
        const updatedItinerary = selectedTrip.itinerary.map((day) => {
          const replacementsForDay = recoveryPlan.affectedActivities.filter(
            (a) => a.day === day.day
          );
          if (replacementsForDay.length === 0) return day;

          const nextActivities = day.activities.map((act) => {
            const match = replacementsForDay.find((r) =>
              act.title.toLowerCase().includes(r.activityTitle.toLowerCase().slice(0, 12))
            );
            if (!match) return act;
            return {
              ...act,
              title: match.replacementActivity,
              description: `Recovered schedule (${match.impact}): ${match.replacementActivity}`,
            };
          });
          return { ...day, activities: nextActivities };
        });

        await saveTrip(
          {
            ...selectedTrip,
            status: 'upcoming',
            itinerary: updatedItinerary,
          },
          true
        );
      }

      showToast(
        decision === 'confirmed' ? 'Recovery Plan Applied' : 'Recovery Plan Dismissed',
        decision === 'confirmed'
          ? 'Your selected alternative has been confirmed and recorded.'
          : 'Original plan remains unchanged.',
        decision === 'confirmed' ? 'success' : 'info'
      );
    } catch (err) {
      showToast(
        'Confirmation Error',
        err instanceof Error ? err.message : 'Unable to persist decision.',
        'error'
      );
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        role="status"
        className="rounded-xl px-4 py-3 border bg-slate-50 border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 font-medium text-[#10243A]">
          <Info className="w-4 h-4 text-[#247BA0] shrink-0" />
          <span>
            User-Reported Disruption Recovery — Real-time airline/hotel webhooks require a live provider integration.
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          All recovery modifications require your explicit confirmation before applying
        </span>
      </div>

      {/* Disruption Intake Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#10243A]">Journey Recovery Centre</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Resolve flight cancellations, delays, hotel overbookings, or weather disruptions with AI-evaluated alternatives
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-2.5 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-slate-200/70 text-[11px] font-medium text-[#10243A] transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyzeDisruption} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Affected Trip (Optional)
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => handleSelectTrip(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Custom / Ad-hoc Route</option>
                {trips.map((t) => (
                  <option key={t.tripId} value={t.tripId}>
                    {t.origin} → {t.destination} ({t.departureDate})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Origin</label>
              <PlacesAutocompleteInput value={origin} onChange={setOrigin} required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Destination</label>
              <PlacesAutocompleteInput value={destination} onChange={setDestination} required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Disruption Scenario
              </label>
              <select
                value={disruptionType}
                onChange={(e) => setDisruptionType(e.target.value as DisruptionType)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                {DISRUPTION_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>
                    {dt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Original Schedule / Time
              </label>
              <input
                type="text"
                value={originalTime}
                onChange={(e) => setOriginalTime(e.target.value)}
                placeholder="e.g. 06:40 – 09:30"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Original Cost ({currency})
              </label>
              <input
                type="number"
                min={0}
                value={originalCost}
                onChange={(e) => setOriginalCost(Number(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Disruption Details
              </label>
              <input
                type="text"
                required
                value={disruptionDetails}
                onChange={(e) => setDisruptionDetails(e.target.value)}
                placeholder="Describe what changed or failed..."
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating Recovery Options...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-[#32C6B5]" />
                  Run Journey Recovery Agent
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      )}

      {recoveryPlan && (
        <div className="space-y-6">
          {recoveryPlan.agentTrace?.length > 0 && (
            <AgentExecutionPanel
              steps={recoveryPlan.agentTrace}
              title="Journey Recovery Agent Trace"
            />
          )}

          {/* Diagnosis Summary */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#247BA0]">
                  Problem Identified
                </p>
                <h3 className="text-base font-bold text-[#10243A] mt-1">
                  {recoveryPlan.problemIdentified}
                </h3>
                <p className="text-xs text-slate-600 mt-1">{recoveryPlan.updatedItinerarySummary}</p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-slate-500">Decision Status</p>
                <p
                  className={`text-xs font-bold uppercase mt-0.5 ${
                    recoveryPlan.status === 'confirmed'
                      ? 'text-[#16A34A]'
                      : recoveryPlan.status === 'dismissed'
                        ? 'text-slate-500'
                        : 'text-[#D97706]'
                  }`}
                >
                  {recoveryPlan.status.replace('_', ' ')}
                </p>
              </div>
            </div>

            {/* Side-by-Side Original Plan vs Recovered Plan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Original Arrangement
                  </p>
                  <h4 className="text-base font-bold text-[#10243A] mt-1.5">
                    {recoveryPlan.originalArrangement.title}
                  </h4>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {recoveryPlan.originalArrangement.details}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-600">
                    <Clock className="w-3.5 h-3.5" />
                    {recoveryPlan.originalArrangement.time}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[#10243A]">
                    {formatCurrency(recoveryPlan.originalArrangement.cost, currency)}
                  </span>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#10243A] text-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#32C6B5]">
                      Recommended Recovered Plan
                    </p>
                    {recoveryPlan.recommendedAlternative.isDemoData && (
                      <span className="text-[10px] font-mono text-amber-300">
                        DEMO DATA – NOT LIVE
                      </span>
                    )}
                  </div>
                  <h4 className="text-base font-bold mt-1.5">
                    {recoveryPlan.recommendedAlternative.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {recoveryPlan.recommendedAlternative.details}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-[#32C6B5]" />
                    {recoveryPlan.recommendedAlternative.time} ({recoveryPlan.timeDifference})
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[#32C6B5]">
                    {formatCurrency(recoveryPlan.recommendedAlternative.cost, currency)} (
                    {recoveryPlan.costDifference})
                  </span>
                </div>
              </div>
            </div>

            {/* Alternative Options & Affected Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Evaluated Alternatives
                </h4>
                <div className="space-y-2.5">
                  {recoveryPlan.alternativeOptions.map((opt) => (
                    <div key={opt.id} className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-[#10243A]">{opt.title}</p>
                        <span className="text-xs font-mono tabular-nums font-semibold text-[#247BA0] shrink-0">
                          {opt.costDifference}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{opt.summary}</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Time impact: {opt.timeDifference} · Trade-off: {opt.tradeOffs}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Downstream Itinerary Adjustments
                </h4>
                {recoveryPlan.affectedActivities.length === 0 ? (
                  <p className="text-xs text-slate-500 p-4 rounded-lg bg-[#F5F7FA]">
                    No downstream itinerary activities require replacement.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {recoveryPlan.affectedActivities.map((act, idx) => (
                      <div key={idx} className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200">
                        <p className="text-xs font-semibold text-[#10243A]">
                          Day {act.day}: {act.activityTitle}
                        </p>
                        <p className="text-[11px] text-[#D97706] mt-0.5">Impact: {act.impact}</p>
                        <p className="text-xs text-[#16A34A] font-medium mt-1 inline-flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          Replacement: {act.replacementActivity}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User Confirmation Gate */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Wallet className="w-4 h-4 text-[#247BA0]" />
                <span>
                  Delta: <strong className="text-[#10243A]">{recoveryPlan.costDifference}</strong> · Time:{' '}
                  <strong className="text-[#10243A]">{recoveryPlan.timeDifference}</strong>
                </span>
              </div>

              {recoveryPlan.status === 'pending_confirmation' ? (
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => void handleConfirmPlan('dismissed')}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Dismiss Plan
                  </button>
                  <button
                    type="button"
                    disabled={applying}
                    onClick={() => void handleConfirmPlan('confirmed')}
                    className="px-4 py-2 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-bold hover:bg-[#2bb4a4] inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {applying ? 'Applying...' : 'Confirm & Apply Recovery Plan'}
                  </button>
                </div>
              ) : (
                <span className="text-xs font-semibold text-[#16A34A] inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Decision Recorded ({recoveryPlan.status})
                </span>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
