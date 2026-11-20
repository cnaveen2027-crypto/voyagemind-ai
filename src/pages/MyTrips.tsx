import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Download,
  Edit3,
  Trash2,
  ShieldAlert,
  CalendarRange,
  Check,
  X,
  Plus,
} from 'lucide-react';
import { CurrencyCode, TripRecord } from '../types/travel';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/currency';
import { exportTripToPdf } from '../utils/pdfExport';

type FilterTab = 'all' | 'upcoming' | 'planned' | 'completed' | 'disrupted';

export default function MyTrips() {
  const { trips, loadingData, saveTrip, removeTrip } = useTravelData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit form fields
  const [editDest, setEditDest] = useState('');
  const [editDep, setEditDep] = useState('');
  const [editRet, setEditRet] = useState('');
  const [editBudget, setEditBudget] = useState(0);
  const [editStatus, setEditStatus] = useState<TripRecord['status']>('planned');

  const filteredTrips = useMemo(() => {
    if (activeTab === 'all') return trips;
    return trips.filter((t) => t.status === activeTab);
  }, [trips, activeTab]);

  const selectedTrip = useMemo(
    () => trips.find((t) => t.tripId === selectedTripId) || filteredTrips[0] || null,
    [trips, selectedTripId, filteredTrips]
  );

  const startEditing = (trip: TripRecord) => {
    setEditingId(trip.tripId);
    setEditDest(trip.destination);
    setEditDep(trip.departureDate);
    setEditRet(trip.returnDate);
    setEditBudget(trip.budget);
    setEditStatus(trip.status);
  };

  const handleSaveEdit = async (trip: TripRecord) => {
    try {
      await saveTrip(
        {
          ...trip,
          destination: editDest.trim() || trip.destination,
          departureDate: editDep,
          returnDate: editRet,
          budget: Number(editBudget) || trip.budget,
          status: editStatus,
        },
        true
      );
      setEditingId(null);
      showToast('Trip Updated', `Saved changes for ${editDest || trip.destination}.`, 'success');
    } catch (err) {
      showToast('Update Failed', err instanceof Error ? err.message : 'Unable to update trip.', 'error');
    }
  };

  const handleDelete = async (tripId: string) => {
    try {
      await removeTrip(tripId);
      setConfirmDeleteId(null);
      if (selectedTripId === tripId) setSelectedTripId(null);
      showToast('Trip Deleted', 'Removed from My Trips.', 'info');
    } catch (err) {
      showToast('Delete Failed', err instanceof Error ? err.message : 'Unable to delete trip.', 'error');
    }
  };

  const statusColor = (status: TripRecord['status']) => {
    if (status === 'upcoming') return 'text-[#247BA0]';
    if (status === 'completed') return 'text-[#16A34A]';
    if (status === 'disrupted') return 'text-[#DC2626]';
    return 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#10243A]">My Trips</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage saved itineraries, export PDFs, or launch Journey Recovery for unexpected disruptions
          </p>
        </div>

        <Link
          to="/planner"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756]"
        >
          <Plus className="w-3.5 h-3.5" />
          Plan New Trip
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            { id: 'all', label: `All (${trips.length})` },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'planned', label: 'Planned' },
            { id: 'completed', label: 'Completed' },
            { id: 'disrupted', label: 'Disrupted' },
          ] as { id: FilterTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? 'bg-[#10243A] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-[#10243A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {[1, 2].map((n) => (
              <div key={n} className="h-36 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-7 h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Briefcase className="w-8 h-8 text-[#247BA0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#10243A]">No trips in this view</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Use the AI Travel Copilot or AI Itinerary Planner to create and save a trip.
          </p>
          <Link
            to="/copilot"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold"
          >
            Launch AI Travel Copilot
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Trips List */}
          <div className="lg:col-span-5 space-y-3">
            {filteredTrips.map((trip) => {
              const isSelected = selectedTrip?.tripId === trip.tripId;
              const isEditing = editingId === trip.tripId;
              const isConfirmingDelete = confirmDeleteId === trip.tripId;

              return (
                <article
                  key={trip.tripId}
                  onClick={() => setSelectedTripId(trip.tripId)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${
                    isSelected ? 'border-[#247BA0] ring-1 ring-[#247BA0]/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editDest}
                        onChange={(e) => setEditDest(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={editDep}
                          onChange={(e) => setEditDep(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                        <input
                          type="date"
                          value={editRet}
                          onChange={(e) => setEditRet(e.target.value)}
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          value={editBudget}
                          onChange={(e) => setEditBudget(Number(e.target.value))}
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg font-mono tabular-nums"
                        />
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as TripRecord['status'])}
                          className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                          <option value="planned">Planned</option>
                          <option value="upcoming">Upcoming</option>
                          <option value="completed">Completed</option>
                          <option value="disrupted">Disrupted</option>
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 rounded border border-slate-200 text-xs text-slate-600 inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(trip)}
                          className="px-2.5 py-1 rounded bg-[#10243A] text-white text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-[#10243A]">
                            {trip.origin} → {trip.destination}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {trip.departureDate} – {trip.returnDate} · {trip.travellers} traveller(s)
                          </p>
                        </div>
                        <span className={`text-xs font-semibold uppercase ${statusColor(trip.status)}`}>
                          {trip.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
                        <span className="text-sm font-bold font-mono tabular-nums text-[#10243A]">
                          {formatCurrency(trip.budget, trip.currency as CurrencyCode)}
                          <span className="text-[11px] font-normal text-slate-500">
                            {' '}
                            · {trip.itinerary.length} day(s)
                          </span>
                        </span>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => startEditing(trip)}
                            aria-label="Edit trip"
                            className="p-1.5 text-slate-500 hover:text-[#10243A] rounded hover:bg-slate-100"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {isConfirmingDelete ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void handleDelete(trip.tripId)}
                                className="px-2 py-1 rounded bg-[#DC2626] text-white text-[11px] font-semibold"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded border border-slate-200 text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(trip.tripId)}
                              aria-label="Delete trip"
                              className="p-1.5 text-slate-500 hover:text-[#DC2626] rounded hover:bg-slate-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>

          {/* Trip Detail Panel */}
          {selectedTrip && (
            <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-[#10243A]">
                    {selectedTrip.origin} → {selectedTrip.destination}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedTrip.departureDate} to {selectedTrip.returnDate} ·{' '}
                    {selectedTrip.travellers} traveller(s) · Target{' '}
                    <span className="font-mono tabular-nums font-semibold text-[#10243A]">
                      {formatCurrency(selectedTrip.budget, selectedTrip.currency)}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportTripToPdf(selectedTrip);
                      showToast('PDF Exported', `Downloaded ${selectedTrip.destination} itinerary.`, 'success');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#10243A] hover:bg-slate-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/planner', {
                        state: {
                          loadedItinerary: selectedTrip.itinerary,
                          prefill: {
                            origin: selectedTrip.origin,
                            destination: selectedTrip.destination,
                            departureDate: selectedTrip.departureDate,
                            returnDate: selectedTrip.returnDate,
                            travellers: selectedTrip.travellers,
                            budget: selectedTrip.budget,
                            currency: selectedTrip.currency,
                            travelStyle: selectedTrip.travelStyle,
                          },
                        },
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#247BA0] hover:bg-slate-50"
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    Edit Plan
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/recovery', {
                        state: { trip: selectedTrip },
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1a3756]"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#32C6B5]" />
                    Journey Recovery
                  </button>
                </div>
              </div>

              {selectedTrip.itinerary.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No daily itinerary activities recorded yet. Open in AI Itinerary Planner to generate days.
                </p>
              ) : (
                <div className="space-y-4">
                  {selectedTrip.itinerary.map((day) => (
                    <div key={day.day} className="p-4 rounded-xl bg-[#F5F7FA] border border-slate-200/70">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <h4 className="text-sm font-bold text-[#10243A]">
                          Day {day.day}: {day.theme}
                        </h4>
                        <span className="text-xs font-mono tabular-nums text-slate-600">
                          ~{formatCurrency(day.estimatedDayCost, selectedTrip.currency)}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {day.activities.map((act) => (
                          <li key={act.id} className="text-xs text-slate-700 flex items-start justify-between gap-3">
                            <div>
                              <span className="font-semibold text-[#247BA0] uppercase mr-1.5">
                                {act.timeSlot}
                              </span>
                              <span className="font-semibold text-[#10243A]">{act.title}</span>
                              <span className="text-slate-500"> · {act.location}</span>
                            </div>
                            <span className="font-mono tabular-nums text-slate-600 shrink-0">
                              {formatCurrency(act.estimatedCost, selectedTrip.currency)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
