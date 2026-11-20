import React, { useEffect, useState } from 'react';
import { Save, CheckCircle2, AlertCircle, Sliders, Server } from 'lucide-react';
import { CurrencyCode, UserTravelPreferences } from '../types/travel';
import { fetchHealthStatus, HealthStatus } from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';

const ACTIVITY_CHOICES = [
  'Beaches',
  'Adventure',
  'Cultural',
  'Historical',
  'Local Cuisine',
  'Nightlife',
  'Nature & Wildlife',
  'Wellness & Spa',
  'Shopping',
];

export default function Settings() {
  const { preferences, updatePreferences } = useTravelData();
  const { showToast } = useToast();

  const [formPrefs, setFormPrefs] = useState<UserTravelPreferences>(preferences);
  const [saving, setSaving] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    setFormPrefs(preferences);
  }, [preferences]);

  useEffect(() => {
    fetchHealthStatus()
      .then(setHealth)
      .catch(() => {});
  }, []);

  const toggleActivity = (act: string) => {
    setFormPrefs((prev) => ({
      ...prev,
      preferredActivities: prev.preferredActivities.includes(act)
        ? prev.preferredActivities.filter((a) => a !== act)
        : [...prev.preferredActivities, act],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePreferences(formPrefs);
      showToast('Settings Saved', 'Default travel preferences and currency updated.', 'success');
    } catch (err) {
      showToast('Save Failed', err instanceof Error ? err.message : 'Unable to save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Travel Preferences */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sliders className="w-4 h-4 text-[#247BA0]" />
          <h2 className="text-lg font-bold text-[#10243A]">Travel Preferences & Currency</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Default Currency</label>
              <select
                value={formPrefs.currency}
                onChange={(e) =>
                  setFormPrefs({ ...formPrefs, currency: e.target.value as CurrencyCode })
                }
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

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Budget Tier</label>
              <select
                value={formPrefs.budgetPreference}
                onChange={(e) =>
                  setFormPrefs({
                    ...formPrefs,
                    budgetPreference: e.target.value as UserTravelPreferences['budgetPreference'],
                  })
                }
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="budget">Budget-Focused</option>
                <option value="balanced">Balanced Value</option>
                <option value="comfort">Comfort</option>
                <option value="luxury">Luxury</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Preferred Accommodation
              </label>
              <select
                value={formPrefs.accommodationPreference}
                onChange={(e) =>
                  setFormPrefs({
                    ...formPrefs,
                    accommodationPreference: e.target
                      .value as UserTravelPreferences['accommodationPreference'],
                  })
                }
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="hostel">Hostel / Co-living</option>
                <option value="boutique">Boutique Hotel</option>
                <option value="hotel">Business / Standard Hotel</option>
                <option value="resort">Resort</option>
                <option value="villa">Private Villa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Travel Style</label>
              <select
                value={formPrefs.travelStyle}
                onChange={(e) =>
                  setFormPrefs({
                    ...formPrefs,
                    travelStyle: e.target.value as UserTravelPreferences['travelStyle'],
                  })
                }
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white"
              >
                <option value="adventure">Adventure</option>
                <option value="relaxed">Relaxed</option>
                <option value="cultural">Cultural</option>
                <option value="family">Family</option>
                <option value="honeymoon">Honeymoon</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Preferred Activity Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_CHOICES.map((act) => {
                const active = formPrefs.preferredActivities.includes(act);
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => toggleActivity(act)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      active
                        ? 'bg-[#247BA0] text-white'
                        : 'bg-slate-100 text-slate-600 hover:text-[#10243A]'
                    }`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </section>

      {/* Read-Only Provider & Integration Status */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[#247BA0]" />
          <h3 className="text-sm font-bold text-[#10243A]">
            Service & Provider Configuration Status
          </h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Server-side environment status (read-only). Secrets and API keys are managed securely on the server environment.
        </p>

        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <span className="font-medium text-[#10243A]">Google Gemini AI Agents (Server-Side)</span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {health?.geminiConfigured ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-[#16A34A]">Configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-[#D97706]" />
                  <span className="text-[#D97706]">Not Configured</span>
                </>
              )}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <span className="font-medium text-[#10243A]">Google Maps Platform (Maps & Places)</span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {health?.mapsConfigured ||
              (import.meta.env.VITE_GOOGLE_MAPS_API_KEY &&
                import.meta.env.VITE_GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY') ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-[#16A34A]">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-[#D97706]" />
                  <span className="text-[#D97706]">Fallback Mode</span>
                </>
              )}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <span className="font-medium text-[#10243A]">Flight Inventory Adapter</span>
            <span className="font-semibold text-[#247BA0]">
              {health?.flightMode === 'live' ? 'Live Provider API' : 'Demo Adapter (Not Live)'}
            </span>
          </div>

          <div className="py-3 flex items-center justify-between">
            <span className="font-medium text-[#10243A]">Hotel Inventory Adapter</span>
            <span className="font-semibold text-[#247BA0]">
              {health?.hotelMode === 'live' ? 'Live Provider API' : 'Demo Adapter (Not Live)'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
