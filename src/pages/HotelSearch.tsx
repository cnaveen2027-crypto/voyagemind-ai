import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Search,
  Star,
  MapPin,
  Scale,
  X,
  Info,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { CurrencyCode, HotelOption } from '../types/travel';
import { searchHotelsApi } from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { PlacesAutocompleteInput } from '../components/maps/PlacesAutocompleteInput';
import { InteractiveTravelMap } from '../components/maps/InteractiveTravelMap';
import { SafeImage } from '../components/common/SafeImage';

type HotelSort = 'price_asc' | 'price_desc' | 'rating';

export default function HotelSearch() {
  const { preferences } = useTravelData();
  const { showToast } = useToast();

  const [destination, setDestination] = useState('Goa');
  const [checkIn, setCheckIn] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [checkOut, setCheckOut] = useState(
    new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10)
  );
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [maxBudget, setMaxBudget] = useState<string>('');
  const [currency, setCurrency] = useState<CurrencyCode>(preferences.currency || 'INR');

  const [hotels, setHotels] = useState<HotelOption[]>([]);
  const [providerBanner, setProviderBanner] = useState(
    'DEMO DATA – NOT LIVE HOTEL INVENTORY'
  );
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  const [sortBy, setSortBy] = useState<HotelSort>('rating');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!destination.trim()) {
      showToast('Destination Required', 'Please enter a destination city.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const res = await searchHotelsApi({
        destination: destination.trim(),
        checkIn,
        checkOut,
        guests,
        rooms,
        maxBudgetPerNight: maxBudget ? Number(maxBudget) : undefined,
        currency,
      });
      setHotels(res.hotels);
      setProviderBanner(res.providerBanner);
      setIsLive(res.isLive);
      setCompareIds([]);
    } catch (err) {
      showToast(
        'Hotel Search Failed',
        err instanceof Error ? err.message : 'Unable to fetch hotels.',
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

  const allAmenities = useMemo(() => {
    const set = new Set<string>();
    hotels.forEach((h) => h.amenities.forEach((a) => set.add(a)));
    return Array.from(set).slice(0, 8);
  }, [hotels]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const displayedHotels = useMemo(() => {
    let list = [...hotels];
    if (selectedAmenities.length > 0) {
      list = list.filter((h) =>
        selectedAmenities.every((am) =>
          h.amenities.some((ha) => ha.toLowerCase().includes(am.toLowerCase()))
        )
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.pricePerNight - b.pricePerNight;
      if (sortBy === 'price_desc') return b.pricePerNight - a.pricePerNight;
      return b.rating - a.rating;
    });
    return list;
  }, [hotels, selectedAmenities, sortBy]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) {
        showToast('Comparison Limit', 'Compare up to 3 hotels at a time.', 'info');
        return prev;
      }
      return [...prev, id];
    });
  };

  const comparedHotels = useMemo(
    () => hotels.filter((h) => compareIds.includes(h.id)),
    [hotels, compareIds]
  );

  const mapMarkers = useMemo(
    () =>
      displayedHotels.map((h) => ({
        id: h.id,
        title: h.name,
        subtitle: h.location,
        tag: `${formatCurrency(h.pricePerNight, h.currency)}/night · ★ ${h.rating}`,
        lat: h.lat,
        lng: h.lng,
      })),
    [displayedHotels]
  );

  const mapCenter = mapMarkers[0]
    ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng }
    : { lat: 15.4909, lng: 73.8278 };

  return (
    <div className="space-y-6">
      {/* Provider Disclosure */}
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
            ? 'Connected to live hospitality inventory'
            : 'Illustrative demo properties & nightly rates generated via Provider Adapter'}
        </span>
      </div>

      {/* Search Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[#10243A]">Hotel Discovery & Comparison</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Search properties by destination, nightly budget, amenities, and interactive map location
          </p>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Destination</label>
            <PlacesAutocompleteInput
              value={destination}
              onChange={setDestination}
              placeholder="City or resort area"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Check-in</label>
            <input
              type="date"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Check-out</label>
            <input
              type="date"
              required
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Guests</label>
              <input
                type="number"
                min={1}
                max={20}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Rooms</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rooms}
                onChange={(e) => setRooms(Number(e.target.value) || 1)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Max Budget / Night (Optional)
            </label>
            <input
              type="number"
              min={500}
              placeholder="Any budget"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Currency</label>
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
          <div className="sm:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Searching Hotels...' : 'Find Hotels'}
            </button>
          </div>
        </form>
      </section>

      {/* Filters & Sorting */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-500 inline-flex items-center gap-1 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Amenities:
          </span>
          {allAmenities.map((am) => {
            const active = selectedAmenities.includes(am);
            return (
              <button
                key={am}
                type="button"
                onClick={() => toggleAmenity(am)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  active
                    ? 'bg-[#247BA0] text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-[#10243A]'
                }`}
              >
                {am}
              </button>
            );
          })}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as HotelSort)}
          aria-label="Sort hotels"
          className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-[#10243A]"
        >
          <option value="rating">Sort: Highest Rated</option>
          <option value="price_asc">Sort: Price Low to High</option>
          <option value="price_desc">Sort: Price High to Low</option>
        </select>
      </div>

      {/* Comparison Matrix */}
      {comparedHotels.length > 0 && (
        <section className="bg-white border border-[#247BA0] rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#247BA0]" />
              <h3 className="text-sm font-bold text-[#10243A]">
                Hotel Comparison ({comparedHotels.length}/3)
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
                  <th className="py-2 pr-4 font-medium">Property</th>
                  {comparedHotels.map((h) => (
                    <th key={h.id} className="py-2 px-3 font-semibold text-[#10243A]">
                      {h.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Rate / Night</td>
                  {comparedHotels.map((h) => (
                    <td key={h.id} className="py-2.5 px-3 font-mono tabular-nums font-bold text-[#10243A]">
                      {formatCurrency(h.pricePerNight, h.currency)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Rating</td>
                  {comparedHotels.map((h) => (
                    <td key={h.id} className="py-2.5 px-3 font-mono tabular-nums">
                      ★ {h.rating} ({h.reviewCount} reviews)
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Area</td>
                  {comparedHotels.map((h) => (
                    <td key={h.id} className="py-2.5 px-3">
                      {h.location}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">Amenities</td>
                  {comparedHotels.map((h) => (
                    <td key={h.id} className="py-2.5 px-3 text-slate-600">
                      {h.amenities.join(', ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-4 text-slate-500">AI Match Insight</td>
                  {comparedHotels.map((h) => (
                    <td key={h.id} className="py-2.5 px-3 text-slate-600">
                      {h.aiMatchReason || h.description}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Results Grid + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            [1, 2, 3].map((n) => (
              <div key={n} className="h-44 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))
          ) : displayedHotels.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <Building2 className="w-8 h-8 text-[#247BA0] mx-auto mb-2.5" />
              <p className="text-sm font-semibold text-[#10243A]">No hotels match these filters</p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing selected amenities or increasing your nightly budget limit.
              </p>
            </div>
          ) : (
            displayedHotels.map((hotel) => {
              const isCompared = compareIds.includes(hotel.id);
              return (
                <article
                  key={hotel.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-[#247BA0] transition-colors"
                >
                  <div className="sm:w-52 h-44 sm:h-auto shrink-0">
                    <SafeImage
                      src={hotel.imageUrl}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-3 min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-bold text-[#10243A] leading-snug">
                          {hotel.name}
                        </h3>
                        <span className="inline-flex items-center gap-1 text-xs font-mono tabular-nums font-semibold text-[#10243A] shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          {hotel.rating}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#247BA0]" />
                        {hotel.location} · {hotel.reviewCount} reviews
                      </p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                        {hotel.description}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {hotel.amenities.slice(0, 5).join(' · ')}
                      </p>
                      {hotel.aiMatchReason && (
                        <p className="text-xs text-[#247BA0] mt-1.5 inline-flex items-center gap-1 font-medium">
                          <Sparkles className="w-3.5 h-3.5 text-[#32C6B5] shrink-0" />
                          <span>{hotel.aiMatchReason}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                      <div>
                        <p className="text-lg font-bold font-mono tabular-nums text-[#10243A]">
                          {formatCurrency(hotel.pricePerNight, hotel.currency)}
                          <span className="text-xs font-normal text-slate-500"> /night</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {hotel.isDemoData ? 'Demo Sample Rate' : hotel.providerName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompare(hotel.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5 ${
                          isCompared
                            ? 'bg-[#32C6B5] text-[#10243A]'
                            : 'border border-slate-200 text-[#10243A] hover:bg-slate-50'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        {isCompared ? 'Compared' : 'Compare'}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
          <InteractiveTravelMap
            center={mapCenter}
            zoom={11}
            heightClassName="h-[440px]"
            markers={mapMarkers}
          />
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
            <p className="font-semibold text-[#10243A]">Interactive Hotel Map</p>
            <p className="mt-1">
              Click any pin on the map to inspect nightly rates, ratings, and neighbourhood placement across {destination}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
