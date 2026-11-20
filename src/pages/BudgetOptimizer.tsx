import React, { useState } from 'react';
import {
  Wallet,
  Sparkles,
  Loader2,
  Info,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { BudgetBreakdown, CurrencyCode } from '../types/travel';
import { optimiseBudgetApi } from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { PlacesAutocompleteInput } from '../components/maps/PlacesAutocompleteInput';

const CHART_COLORS = [
  '#10243A',
  '#247BA0',
  '#32C6B5',
  '#0EA5E9',
  '#6366F1',
  '#F59E0B',
  '#64748B',
];

export default function BudgetOptimizer() {
  const { trips, preferences, saveTrip } = useTravelData();
  const { showToast } = useToast();

  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [origin, setOrigin] = useState('Chennai');
  const [destination, setDestination] = useState('Goa');
  const [days, setDays] = useState(4);
  const [travellers, setTravellers] = useState(4);
  const [totalBudget, setTotalBudget] = useState(40000);
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency || 'INR');
  const [travelStyle, setTravelStyle] = useState('Balanced & Adventure');

  const [breakdown, setBreakdown] = useState<BudgetBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleLoadTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    const found = trips.find((t) => t.tripId === tripId);
    if (!found) return;
    setOrigin(found.origin);
    setDestination(found.destination);
    setTravellers(found.travellers);
    setTotalBudget(found.budget);
    setCurrency(found.currency);
    if (found.travelStyle) setTravelStyle(found.travelStyle);
    const d1 = new Date(found.departureDate);
    const d2 = new Date(found.returnDate);
    if (!Number.isNaN(d1.getTime()) && !Number.isNaN(d2.getTime())) {
      setDays(Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1));
    }
    if (found.budgetBreakdown) {
      setBreakdown(found.budgetBreakdown);
    }
  };

  const handleOptimise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      showToast('Missing Destination', 'Please enter a destination.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await optimiseBudgetApi({
        origin: origin.trim(),
        destination: destination.trim(),
        days,
        travellers,
        totalBudget,
        currency,
        travelStyle,
      });
      setBreakdown(res);
      showToast('Budget Optimised', `Generated 7-category plan for ${destination}.`, 'success');
    } catch (err) {
      showToast(
        'Optimisation Failed',
        err instanceof Error ? err.message : 'Unable to optimise budget.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplyToTrip = async () => {
    if (!selectedTripId || !breakdown) return;
    const trip = trips.find((t) => t.tripId === selectedTripId);
    if (!trip) return;
    setApplying(true);
    try {
      await saveTrip({ ...trip, budget: totalBudget, currency, budgetBreakdown: breakdown }, true);
      showToast('Applied to Trip', `Saved budget breakdown to ${trip.destination}.`, 'success');
    } catch (err) {
      showToast('Update Failed', err instanceof Error ? err.message : 'Could not update trip.', 'error');
    } finally {
      setApplying(false);
    }
  };

  const utilisationPct = breakdown
    ? Math.min(100, Math.round((breakdown.estimatedTotal / Math.max(1, breakdown.totalBudget)) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div
        role="status"
        className="rounded-xl px-4 py-3 border bg-slate-50 border-slate-200 text-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs"
      >
        <div className="flex items-center gap-2 font-medium text-[#10243A]">
          <Info className="w-4 h-4 text-[#247BA0] shrink-0" />
          <span>Estimated Costs (Illustrative) — AI-modelled travel expense projections</span>
        </div>
        <span className="text-[11px] text-slate-500">
          Covers Flights, Hotels, Food, Transportation, Activities, Shopping & Miscellaneous
        </span>
      </div>

      {/* Input Panel */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-[#10243A]">AI Budget Optimizer</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Allocate target funds across 7 travel categories and uncover actionable cost savings
            </p>
          </div>
          {trips.length > 0 && (
            <select
              value={selectedTripId}
              onChange={(e) => handleLoadTrip(e.target.value)}
              aria-label="Load saved trip parameters"
              className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-[#10243A]"
            >
              <option value="">Load from My Trips (Optional)</option>
              {trips.map((t) => (
                <option key={t.tripId} value={t.tripId}>
                  {t.origin} → {t.destination} ({formatCurrency(t.budget, t.currency)})
                </option>
              ))}
            </select>
          )}
        </div>

        <form onSubmit={handleOptimise} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Origin City</label>
            <PlacesAutocompleteInput value={origin} onChange={setOrigin} placeholder="e.g. Chennai" />
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Trip Days</label>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 1)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
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
                min={500}
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value) || 1000)}
                className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Spending Style</label>
            <select
              value={travelStyle}
              onChange={(e) => setTravelStyle(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="Backpacker Budget">Backpacker Budget</option>
              <option value="Balanced & Adventure">Balanced & Adventure</option>
              <option value="Comfort Family">Comfort Family</option>
              <option value="Luxury Boutique">Luxury Boutique</option>
            </select>
          </div>
          <div className="sm:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-5 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Optimising Allocation...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#32C6B5]" />
                  Optimise Budget
                </>
              )}
            </button>
            {selectedTripId && breakdown && (
              <button
                type="button"
                disabled={applying}
                onClick={handleApplyToTrip}
                className="py-2.5 px-4 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold hover:bg-[#2bb4a4] inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                {applying ? 'Saving...' : 'Save to Trip'}
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Results & Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : breakdown ? (
        <>
          {/* Summary Strip */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">Target Budget</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-1.5">
                {formatCurrency(breakdown.totalBudget, breakdown.currency)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">Estimated Total Spend</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-[#247BA0] mt-1.5">
                {formatCurrency(breakdown.estimatedTotal, breakdown.currency)}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs text-slate-500 font-medium">Remaining Buffer</p>
              <p
                className={`text-2xl font-bold font-mono tabular-nums mt-1.5 ${
                  breakdown.remainingBudget >= 0 ? 'text-[#16A34A]' : 'text-[#DC2626]'
                }`}
              >
                {formatCurrency(breakdown.remainingBudget, breakdown.currency)}
              </p>
            </div>
          </section>

          {/* Budget Utilisation Bar */}
          <section className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-[#10243A]">Budget Utilisation</span>
              <span className="font-mono tabular-nums font-semibold text-[#10243A]">
                {utilisationPct}% of target budget
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  breakdown.remainingBudget >= 0 ? 'bg-[#32C6B5]' : 'bg-[#D97706]'
                }`}
                style={{ width: `${utilisationPct}%` }}
              />
            </div>
          </section>

          {/* Pie + Bar Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-[#10243A] mb-4">Expense Share by Category</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown.categories}
                      dataKey="estimatedAmount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={95}
                      paddingAngle={2}
                    >
                      {breakdown.categories.map((entry, index) => (
                        <Cell
                          key={entry.category}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: unknown) =>
                        formatCurrency(Number(val) || 0, breakdown.currency)
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-[#10243A] mb-4">
                Category-Wise Spend ({breakdown.currency})
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown.categories} margin={{ top: 10, right: 16, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#475569' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                    <Tooltip
                      formatter={(val: unknown) =>
                        formatCurrency(Number(val) || 0, breakdown.currency)
                      }
                    />
                    <Bar dataKey="estimatedAmount" fill="#247BA0" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {/* Category Breakdown Table + AI Cost-Saving Tips */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-[#10243A] mb-4">
                7-Category Cost Breakdown (Estimated)
              </h3>
              <div className="divide-y divide-slate-100">
                {breakdown.categories.map((cat, idx) => (
                  <div key={cat.category} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-[#10243A]">{cat.category}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{cat.notes}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono tabular-nums text-[#10243A]">
                        {formatCurrency(cat.estimatedAmount, breakdown.currency)}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-500">
                        {cat.percentage}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-[#16A34A]" />
                <h3 className="text-sm font-bold text-[#10243A]">AI Cost-Saving Recommendations</h3>
              </div>
              <div className="space-y-3">
                {breakdown.savingsRecommendations.map((tip, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-[#F5F7FA] border border-slate-200/70">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-bold text-[#10243A]">{tip.title}</p>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[#16A34A] shrink-0">
                        Save ~{formatCurrency(tip.potentialSavings, breakdown.currency)}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#247BA0] font-medium mt-0.5">{tip.category}</p>
                    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{tip.action}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Wallet className="w-8 h-8 text-[#247BA0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#10243A]">Model your travel budget</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Enter your destination, duration, group size, and target budget above—or load an existing saved trip—to run the AI Budget Optimisation Agent.
          </p>
        </div>
      )}
    </div>
  );
}
