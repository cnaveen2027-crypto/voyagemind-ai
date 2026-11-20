import { TripRecord } from '../../src/types/travel';

const serverTrips = new Map<string, TripRecord>();

export function listServerTrips(userId?: string): TripRecord[] {
  const all = Array.from(serverTrips.values());
  if (userId) {
    return all.filter((t) => t.userId === userId);
  }
  return all;
}

export function createServerTrip(trip: TripRecord): TripRecord {
  serverTrips.set(trip.tripId, trip);
  return trip;
}

export function updateServerTrip(tripId: string, patch: Partial<TripRecord>): TripRecord | null {
  const existing = serverTrips.get(tripId);
  if (!existing) return null;
  const updated: TripRecord = {
    ...existing,
    ...patch,
    tripId: existing.tripId,
    updatedAt: new Date().toISOString(),
  };
  serverTrips.set(tripId, updated);
  return updated;
}

export function deleteServerTrip(tripId: string): boolean {
  return serverTrips.delete(tripId);
}
