import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Bookmark,
  ExternalLink,
  MapPin,
  Loader2,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { DESTINATIONS_CATALOG } from '../data/destinations';
import { DestinationCatalogItem, GroundingLink } from '../types/travel';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';
import { analyzeDestination, generateDestinationImageApi } from '../services/apiService';
import { formatCurrency } from '../utils/currency';
import { InteractiveTravelMap } from '../components/maps/InteractiveTravelMap';
import { SafeImage } from '../components/common/SafeImage';

const CATEGORIES = [
  'All',
  'Adventure',
  'Beaches',
  'Historical',
  'Family',
  'Honeymoon',
  'Nature',
  'Cultural',
  'Luxury',
  'Budget',
];

export default function Destinations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { savedDestinations, toggleSavedDestination, preferences } = useTravelData();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedSeason, setSelectedSeason] = useState('All');
  const [budgetTier, setBudgetTier] = useState<'All' | 'Budget' | 'Mid' | 'Luxury'>('All');

  const [activeDest, setActiveDest] = useState<DestinationCatalogItem>(DESTINATIONS_CATALOG[0]);
  const [aiNarrative, setAiNarrative] = useState<string>('');
  const [groundingLinks, setGroundingLinks] = useState<GroundingLink[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Image Generation Studio (1K, 2K, 4K)
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [generatedPreviewUrl, setGeneratedPreviewUrl] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  useEffect(() => {
    const state = location.state as { selectedId?: string } | null;
    if (state?.selectedId) {
      const found = DESTINATIONS_CATALOG.find((d) => d.id === state.selectedId);
      if (found) setActiveDest(found);
    }
  }, [location.state]);

  const countries = useMemo(
    () => ['All', ...Array.from(new Set(DESTINATIONS_CATALOG.map((d) => d.country)))],
    []
  );

  const filteredDestinations = useMemo(() => {
    return DESTINATIONS_CATALOG.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.popularAttractions.some((a) => a.toLowerCase().includes(q));
      const matchCat =
        selectedCategory === 'All' || d.categories.includes(selectedCategory);
      const matchCountry = selectedCountry === 'All' || d.country === selectedCountry;
      const matchSeason =
        selectedSeason === 'All' ||
        d.bestSeason.toLowerCase().includes(selectedSeason.toLowerCase());
      const matchBudget =
        budgetTier === 'All' ||
        (budgetTier === 'Budget' && d.estimatedBudgetINR <= 80000) ||
        (budgetTier === 'Mid' && d.estimatedBudgetINR > 80000 && d.estimatedBudgetINR <= 160000) ||
        (budgetTier === 'Luxury' && d.estimatedBudgetINR > 160000);
      return matchSearch && matchCat && matchCountry && matchSeason && matchBudget;
    });
  }, [searchQuery, selectedCategory, selectedCountry, selectedSeason, budgetTier]);

  const handleLoadInsights = async (dest: DestinationCatalogItem) => {
    setActiveDest(dest);
    setLoadingInsights(true);
    setAiNarrative('');
    setGroundingLinks([]);
    setGeneratedPreviewUrl(null);
    try {
      const res = await analyzeDestination({
        destination: `${dest.name}, ${dest.country}`,
        preferences: preferences.preferredActivities,
        budget: dest.estimatedBudgetINR,
        currency: preferences.currency,
        days: dest.recommendedDays,
        userLatLng: { latitude: dest.lat, longitude: dest.lng },
      });
      setAiNarrative(res.narrative);
      setGroundingLinks(res.groundingLinks);
    } catch (err) {
      showToast(
        'Destination Analysis Error',
        err instanceof Error ? err.message : 'Unable to fetch Maps-grounded recommendations.',
        'error'
      );
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleGenerateVisual = async () => {
    setGeneratingImage(true);
    try {
      const res = await generateDestinationImageApi({
        prompt: `Editorial travel photography postcard of ${activeDest.name}, ${activeDest.country}, showcasing ${activeDest.popularAttractions[0] || activeDest.name} during ${activeDest.bestSeason}, golden natural sunlight, crisp architectural and landscape detail.`,
        imageSize,
        aspectRatio: '16:9',
      });
      setGeneratedPreviewUrl(res.imageDataUrl);
      showToast('Visual Generated', `Created ${res.imageSize} destination preview.`, 'success');
    } catch (err) {
      showToast(
        'Image Generation Unavailable',
        err instanceof Error ? err.message : 'Could not generate custom destination image.',
        'warning'
      );
    } finally {
      setGeneratingImage(false);
    }
  };

  const isSaved = savedDestinations.some((s) => s.destinationId === activeDest.id);

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destinations, countries, or attractions..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
            />
          </div>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            aria-label="Filter by country"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            {countries.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Countries' : c}
              </option>
            ))}
          </select>

          <select
            value={budgetTier}
            onChange={(e) => setBudgetTier(e.target.value as typeof budgetTier)}
            aria-label="Filter by budget"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="All">All Budgets</option>
            <option value="Budget">Budget Friendly (≤ ₹80k)</option>
            <option value="Mid">Mid-Range (₹80k – ₹1.6L)</option>
            <option value="Luxury">Luxury (&gt; ₹1.6L)</option>
          </select>

          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            aria-label="Filter by season"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
          >
            <option value="All">All Seasons</option>
            <option value="November">Winter / Nov–Feb</option>
            <option value="March">Spring / Mar–May</option>
            <option value="June">Summer / Jun–Sep</option>
            <option value="October">Autumn / Oct</option>
          </select>
        </div>

        {/* Interactive Category Segmented Filter */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#10243A] text-white'
                  : 'bg-[#F5F7FA] text-slate-600 hover:text-[#10243A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Main Grid: Destination Cards + Interactive Map & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredDestinations.length === 0 ? (
            <div className="sm:col-span-2 bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="text-sm font-semibold text-[#10243A]">No matching destinations found</p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing one of your season, country, or category filters.
              </p>
            </div>
          ) : (
            filteredDestinations.map((dest) => {
              const selected = activeDest.id === dest.id;
              return (
                <article
                  key={dest.id}
                  className={`bg-white rounded-xl overflow-hidden border transition-colors flex flex-col ${
                    selected ? 'border-[#247BA0] ring-1 ring-[#247BA0]' : 'border-slate-200'
                  }`}
                >
                  <div className="h-44 overflow-hidden">
                    <SafeImage
                      src={dest.imageUrl}
                      alt={`${dest.name}, ${dest.country}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-[#10243A]">
                        {dest.name}, {dest.country}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {dest.categories.slice(0, 3).join(' · ')}
                      </p>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-2">
                        {dest.description}
                      </p>
                      <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                        <p>
                          Est. Budget:{' '}
                          <span className="font-mono tabular-nums font-semibold text-[#10243A]">
                            {formatCurrency(dest.estimatedBudgetINR, 'INR')}
                          </span>{' '}
                          ({dest.recommendedDays} days)
                        </p>
                        <p>Best Season: {dest.bestSeason}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleLoadInsights(dest)}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756] transition-colors"
                      >
                        Inspect & Ground
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          navigate('/planner', {
                            state: {
                              prefill: {
                                destination: `${dest.name}, ${dest.country}`,
                                budget: dest.estimatedBudgetINR,
                              },
                            },
                          })
                        }
                        className="py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#10243A] hover:bg-slate-50"
                      >
                        Plan
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Right Detail Panel + Google Maps */}
        <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          <InteractiveTravelMap
            center={{ lat: activeDest.lat, lng: activeDest.lng }}
            zoom={5}
            heightClassName="h-[280px]"
            markers={filteredDestinations.map((d) => ({
              id: d.id,
              title: `${d.name}, ${d.country}`,
              subtitle: d.bestSeason,
              tag: `Est. ${formatCurrency(d.estimatedBudgetINR, 'INR')}`,
              lat: d.lat,
              lng: d.lng,
            }))}
            onSelectMarker={(pt) => {
              const found = DESTINATIONS_CATALOG.find((d) => d.id === pt.id);
              if (found) setActiveDest(found);
            }}
          />

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#10243A]">
                  {activeDest.name}, {activeDest.country}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeDest.recommendedDays} days recommended · {activeDest.bestSeason}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  void toggleSavedDestination({
                    destinationId: activeDest.id,
                    destination: activeDest.name,
                    country: activeDest.country,
                    estimatedBudget: activeDest.estimatedBudgetINR,
                  }).then((saved) =>
                    showToast(
                      saved ? 'Destination Saved' : 'Removed Bookmark',
                      `${activeDest.name} ${saved ? 'added to' : 'removed from'} saved destinations.`,
                      'info'
                    )
                  )
                }
                className={`p-2 rounded-lg border transition-colors ${
                  isSaved
                    ? 'bg-[#32C6B5]/15 border-[#32C6B5] text-[#10243A]'
                    : 'border-slate-200 text-slate-500 hover:text-[#10243A]'
                }`}
                aria-label="Toggle save destination"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">Popular Attractions</p>
              <p className="text-xs text-[#182B3A] leading-relaxed">
                {activeDest.popularAttractions.join(' · ')}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={loadingInsights}
                onClick={() => void handleLoadInsights(activeDest)}
                className="flex-1 py-2 px-3 rounded-lg bg-[#247BA0] text-white text-xs font-semibold hover:bg-[#1d6483] transition-colors inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Grounding with Maps...
                  </>
                ) : (
                  'Get Gemini + Maps Insights'
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate('/planner', {
                    state: {
                      prefill: {
                        destination: `${activeDest.name}, ${activeDest.country}`,
                        budget: activeDest.estimatedBudgetINR,
                      },
                    },
                  })
                }
                className="py-2 px-3 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756] inline-flex items-center gap-1"
              >
                Plan Trip <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {aiNarrative && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <p className="text-xs font-semibold text-[#10243A]">
                  Destination Discovery Agent Brief
                </p>
                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                  {aiNarrative}
                </div>
                {groundingLinks.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs font-semibold text-[#10243A] mb-1.5">
                      Google Maps Grounded Places
                    </p>
                    <ul className="space-y-1">
                      {groundingLinks.map((g, i) => (
                        <li key={i}>
                          <a
                            href={g.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#247BA0] hover:underline"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{g.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* High-Quality Destination Image Studio (1K / 2K / 4K) */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[#10243A]">AI Destination Visual</p>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                  {(['1K', '2K', '4K'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setImageSize(sz)}
                      className={`px-2 py-0.5 text-[11px] font-mono rounded-md transition-colors ${
                        imageSize === sz
                          ? 'bg-white text-[#10243A] font-semibold shadow-sm'
                          : 'text-slate-600'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={generatingImage}
                onClick={handleGenerateVisual}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 text-xs font-medium text-[#10243A] hover:bg-slate-50 inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {generatingImage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Rendering {imageSize} Postcard...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-3.5 h-3.5 text-[#247BA0]" />
                    Generate {imageSize} Visual via Gemini Pro Image
                  </>
                )}
              </button>
              {generatedPreviewUrl && (
                <img
                  src={generatedPreviewUrl}
                  alt={`AI generated ${activeDest.name} visual`}
                  className="w-full h-40 object-cover rounded-lg border border-slate-200"
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
