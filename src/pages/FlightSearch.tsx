import React, { useEffect, useMemo, useState } from 'react';
import {
  Plane,
  Search,
  ArrowUpDown,
  Scale,
  X,
  Info,
  Luggage,
  Clock,
  Sparkles,
} from 'lucide-react';
import { CurrencyCode, FlightOption } from '../types/travel';
import { searchFlightsApi } from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { PlacesAutocompleteInput } from '../components/maps/PlacesAutocompleteInput';

type SortOption = 'price' | 'duration' | 'departure';

export default function FlightSearch() {
  const { preferences } = useTravelData();
  const { showToast } = useToast();

  const [origin, setOrigin] = useState('Chennai');
  const [destination, setDestination] = useState('Goa');
  const [departureDate, setDepartureDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [returnDate, setReturnDate] = useState(
    new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10)
  );
  const [passengers, setPassengers] = useState(2);
  const [cabinClass, setCabinClass] = useState('Economy');
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency || 'INR');

  const [flights, setFlights] = useState<FlightOption[]>([]);
  const [providerBanner, setProviderBanner] = useState(
    'DEMO DATA – NOT LIVE FLIGHT AVAILABILITY'
  );
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('price');
  const [nonStopOnly, setNonStopOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      showToast('Missing Route', 'Enter both origin and destination.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await searchFlightsApi({
        origin: origin.trim(),
        destination: destination.trim(),
        departureDate,
        returnDate,
        passengers,
        cabinClass,
        currency,
      });
      setFlights(res.flights);
      setProviderBanner(res.providerBanner);
      setIsLive(res.isLive);
      setCompareIds([]);
    } catch (err) {
      showToast(
        'Flight Search Failed',
        err instanceof Error ? err.message : 'Unable to fetch flights.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayedFlights = useMemo(() => {
    let list = [...flights];
    if (nonStopOnly) {
      list = list.filter((f) => f.stops === 0);
    }
    list.sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'duration') return a.durationMinutes - b.durationMinutes;
      return a.departureTime.localeCompare(b.departureTime);
    });
    return list;
  }, [flights, nonStopOnly, sortBy]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        showToast('Comparison Limit', 'Compare up to 3 flights at a time.', 'info');
        return prev;
      }
      return [...prev, id];
    });
  };

  const comparedFlights = useMemo(
    () => flights.filter((f) => compareIds.includes(f.id)),
    [flights, compareIds]
  );

  return (
    <div className="space-y-6">
      {/* Provider Disclosure Banner */}
      <div
        role="status"
        className={`rounded-xl px-4 py-3 border flex flex-wrap items-center justify-between gap-2 text-xs ${
          isLive
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Info className="w-4 h-4 shrink-0" />
          <span>{providerBanner}</span>
        </div>
        <span className="text-[11px] opacity-80">
          {isLive
            ? 'Connected to configured flight inventory API'
            : 'Illustrative demo fares & schedules generated via Provider Adapter'}
        </span>
      </div>

      {/* Search Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#10243A]">Flight Intelligence & Search</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare schedules, baggage allowances, stops, and AI-evaluated value scores
          </p>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">From</label>
            <PlacesAutocompleteInput value={origin} onChange={setOrigin} placeholder="Origin city" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">To</label>
            <PlacesAutocompleteInput
              value={destination}
              onChange={setDestination}
              placeholder="Destination city"
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
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Return Date (Optional)</label>
            <input
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Passengers</label>
            <input
              type="number"
              min={1}
              max={15}
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value) || 1)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Cabin Class</label>
            <select
              value={cabinClass}
              onChange={(e) => setCabinClass(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="Economy">Economy</option>
              <option value="Premium Economy">Premium Economy</option>
              <option value="Business">Business</option>
              <option value="First">First</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Display Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="AED">AED</option>
              <option value="JPY">JPY (¥)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search Flights'}
            </button>
          </div>
        </form>
      </section>

      {/* Sorting & Filtering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mr-1">
            <ArrowUpDown className="w-3.5 h-3.5" />
            Sort by:
          </span>
          {(
            [
              { id: 'price', label: 'Lowest Price' },
              { id: 'duration', label: 'Shortest Duration' },
              { id: 'departure', label: 'Earliest Departure' },
            ] as { id: SortOption; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortBy(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === opt.id
                  ? 'bg-[#10243A] text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-[#10243A]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#182B3A] cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <input
            type="checkbox"
            checked={nonStopOnly}
            onChange={(e) => setNonStopOnly(e.target.checked)}
            className="rounded border-slate-300 text-[#247BA0] focus:ring-[#247BA0]"
          />
          Non-stop flights only
        </label>
      </div>

      {/* Side-by-Side Comparison Drawer */}
      {comparedFlights.length > 0 && (
        <section className="bg-white border border-[#247BA0] rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#247BA0]" />
              <h3 className="text-sm font-bold text-[#10243A]">
                Flight Comparison ({comparedFlights.length}/3)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              className="text-xs text-slate-500 hover:text-[#10243A] inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Attribute</th>
                  {comparedFlights.map((f) => (
                    <th key={f.id} className="py-2 px-3 font-semibold text-[#10243A]">
                      {f.airline} ({f.flightNumber})
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Total / Sample Fare</td>
                  {comparedFlights.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 font-mono tabular-nums font-bold text-[#10243A]">
                      {formatCurrency(f.price, f.currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Schedule</td>
                  {comparedFlights.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 font-mono tabular-nums">
                      {f.departureTime} → {f.arrivalTime}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Duration & Stops</td>
                  {comparedFlights.map((f) => (
                    <td key={f.id} className="py-2.5 px-3">
                      {f.durationLabel} · {f.stops === 0 ? 'Non-stop' : `${f.stops} stop`}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Baggage</td>
                  {comparedFlights.map((f) => (
                    <td key={f.id} className="py-2.5 px-3">
                      {f.baggage}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">AI Value Note</td>
                  {comparedFlights.map((f) => (
                    <td key={f.id} className="py-2.5 px-3 text-slate-600">
                      {f.aiRankReason || 'Standard itinerary fit'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Results List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayedFlights.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Plane className="w-8 h-8 text-[#247BA0] mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-[#10243A]">No matching flights found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try disabling the non-stop filter or adjusting your route and dates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedFlights.map((flight) => {
            const isCompared = compareIds.includes(flight.id);
            return (
              <article
                key={flight.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-[#247BA0] transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#F5F7FA] border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold font-mono text-[#10243A]">
                      {flight.airlineCode}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-bold text-[#10243A]">{flight.airline}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="font-mono text-xs text-slate-500">{flight.flightNumber}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="text-xs text-slate-500">{flight.cabinClass}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
                      <span className="font-mono tabular-nums font-semibold text-[#10243A]">
                        {flight.departureTime} ({flight.origin}) → {flight.arrivalTime} ({flight.destination})
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-[#247BA0]" />
                        {flight.durationLabel}
                      </span>
                      <span className="text-xs font-medium text-[#247BA0]">
                        {flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop (${flight.stopDetails || 'Layover'})`}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Luggage className="w-3.5 h-3.5" />
                        {flight.baggage}
                      </span>
                      {flight.aiRankReason && (
                        <span className="inline-flex items-center gap-1 text-[#10243A]">
                          <Sparkles className="w-3.5 h-3.5 text-[#32C6B5]" />
                          {flight.aiRankReason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                  <div className="text-left lg:text-right">
                    <p className="text-xl font-bold font-mono tabular-nums text-[#10243A]">
                      {formatCurrency(flight.price, flight.currency)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {flight.isDemoData ? 'Demo Sample Fare' : flight.providerName} · {passengers}{' '}
                      pax est.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleCompare(flight.id)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap ${
                      isCompared
                        ? 'bg-[#32C6B5] text-[#10243A]'
                        : 'border border-slate-200 text-[#10243A] hover:bg-slate-50'
                    }`}
                  >
                    <Scale className="w-3.5 h-3.5" />
                    {isCompared ? 'Added to Compare' : 'Compare'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
