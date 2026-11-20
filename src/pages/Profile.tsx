import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, MapPin, BookmarkCheck, Trash2, CalendarRange, LogIn, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, isCloudSynced, profileName, homeAirport, updateProfileInfo } = useAuth();
  const { trips, conversations, savedDestinations, toggleSavedDestination } = useTravelData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [nameInput, setNameInput] = useState(profileName);
  const [airportInput, setAirportInput] = useState(homeAirport);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfileInfo(nameInput.trim() || 'Traveller', airportInput.trim() || 'Chennai (MAA)');
      showToast('Profile Updated', 'Your traveller profile details have been saved.', 'success');
    } catch (err) {
      showToast('Update Failed', err instanceof Error ? err.message : 'Unable to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Account Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#10243A] text-white flex items-center justify-center">
            <User className="w-6 h-6 text-[#32C6B5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#10243A]">{profileName}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.email || 'Local Demo Workspace'} ·{' '}
              <span className="font-medium text-[#247BA0]">
                {isCloudSynced ? 'Verified Firebase Cloud Sync' : 'Browser Local Persistence'}
              </span>
            </p>
          </div>
        </div>

        {!user && (
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold hover:bg-[#2bb4a4]"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In for Cloud Sync
          </Link>
        )}
      </section>

      {/* Workspace Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Saved Trips</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-1">{trips.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Saved Destinations</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-1">
            {savedDestinations.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs text-slate-500">Copilot Sessions</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A] mt-1">
            {conversations.length}
          </p>
        </div>
      </div>

      {/* Edit Profile Form */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="text-sm font-bold text-[#10243A] mb-4">Traveller Details</h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Home City / Airport
            </label>
            <input
              type="text"
              required
              value={airportInput}
              onChange={(e) => setAirportInput(e.target.value)}
              placeholder="e.g. Chennai (MAA)"
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756] disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* Saved Destinations */}
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-[#247BA0]" />
            <h3 className="text-sm font-bold text-[#10243A]">Saved Destinations</h3>
          </div>
          <Link to="/destinations" className="text-xs font-semibold text-[#247BA0] hover:underline">
            Explore More
          </Link>
        </div>

        {savedDestinations.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">
            No destinations bookmarked yet. Visit Destination Explorer to save places to your shortlist.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {savedDestinations.map((item) => (
              <div key={item.destinationId} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-[#247BA0]" />
                  <div>
                    <p className="text-sm font-semibold text-[#10243A]">
                      {item.destination}, {item.country}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Saved {new Date(item.savedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/planner', {
                        state: { prefill: { destination: item.destination } },
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#10243A] hover:bg-slate-50"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    Plan Trip
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void toggleSavedDestination({
                        destinationId: item.destinationId,
                        destination: item.destination,
                        country: item.country,
                      })
                    }
                    aria-label="Remove saved destination"
                    className="p-1.5 text-slate-400 hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
