import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  ConversationRecord,
  RecoveryPlanResult,
  TripRecord,
  UserTravelPreferences,
} from '../types/travel';
import { useAuth } from './AuthContext';
import {
  deleteConversationDoc,
  deleteTripDoc,
  getTravelPreferencesDoc,
  removeSavedDestinationDoc,
  saveConversationDoc,
  saveDestinationDoc,
  saveRecoveryPlanDoc,
  saveTravelPreferencesDoc,
  saveTripDoc,
  subscribeSavedDestinations,
  subscribeUserConversations,
  subscribeUserTrips,
  updateRecoveryPlanStatusDoc,
} from '../services/firebaseService';

const LOCAL_TRIPS_KEY = 'voyagemind_local_trips_v1';
const LOCAL_CONVS_KEY = 'voyagemind_local_convs_v1';
const LOCAL_SAVED_DEST_KEY = 'voyagemind_local_saved_dests_v1';
const LOCAL_PREFS_KEY = 'voyagemind_local_prefs_v1';

const SEED_DEMO_TRIPS: TripRecord[] = [
  {
    tripId: 'demo_goa_escape',
    userId: 'demo-local',
    origin: 'Chennai',
    destination: 'Goa',
    departureDate: '2026-12-18',
    returnDate: '2026-12-21',
    travellers: 4,
    budget: 40000,
    currency: 'INR',
    travelStyle: 'Beaches & Adventure',
    status: 'upcoming',
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
    itinerary: [
      {
        day: 1,
        date: '2026-12-18',
        theme: 'Arrival & North Goa Coastal Forts',
        estimatedDayCost: 8500,
        activities: [
          {
            id: 'goa-d1-1',
            timeSlot: 'morning',
            title: 'Arrive at Dabolim & Check-in near Candolim',
            location: 'Candolim, North Goa',
            description: 'Airport transfer and coastal brunch overlooking the Arabian Sea.',
            estimatedCost: 2200,
            travelTime: '45 mins',
            transportMode: 'Prepaid Cab',
            category: 'Arrival',
            lat: 15.518,
            lng: 73.762,
          },
          {
            id: 'goa-d1-2',
            timeSlot: 'afternoon',
            title: 'Fort Aguada & Sinquerim Lighthouse Walk',
            location: 'Fort Aguada, Goa',
            description: '17th-century Portuguese coastal bastion with panoramic bay vistas.',
            estimatedCost: 800,
            travelTime: '15 mins',
            transportMode: 'Scooter / Cab',
            category: 'Heritage',
            lat: 15.492,
            lng: 73.773,
          },
          {
            id: 'goa-d1-3',
            timeSlot: 'evening',
            title: 'Anjuna Sunset Cliff & Live Acoustic Night',
            location: 'Anjuna Beach',
            description: 'Evening cliffside dining and coastal nightlife.',
            estimatedCost: 3500,
            travelTime: '25 mins',
            transportMode: 'Cab',
            category: 'Nightlife',
            lat: 15.573,
            lng: 73.741,
          },
        ],
        suggestedRestaurants: [
          { name: 'Calamari Bathe & Binge', cuisine: 'Goan Seafood', estimatedCost: 1800, area: 'Candolim' },
        ],
      },
      {
        day: 2,
        date: '2026-12-19',
        theme: 'Water Sports & Latin Quarter Heritage',
        estimatedDayCost: 9800,
        activities: [
          {
            id: 'goa-d2-1',
            timeSlot: 'morning',
            title: 'Kayaking & Parasailing at Baga Cove',
            location: 'Baga Beach',
            description: 'Morning adventure water sports session with certified operators.',
            estimatedCost: 4200,
            travelTime: '20 mins',
            transportMode: 'Scooter',
            category: 'Adventure',
            lat: 15.555,
            lng: 73.751,
          },
          {
            id: 'goa-d2-2',
            timeSlot: 'afternoon',
            title: 'Fontainhas Latin Quarter Heritage Walk',
            location: 'Panaji, Goa',
            description: 'Ochre-walled lanes, bakeries, and riverside Mandovi promenade.',
            estimatedCost: 1600,
            travelTime: '30 mins',
            transportMode: 'Cab',
            category: 'Cultural',
            lat: 15.496,
            lng: 73.831,
          },
          {
            id: 'goa-d2-3',
            timeSlot: 'evening',
            title: 'Chapora Hilltop Sunset & Vagator Beach',
            location: 'Vagator, Goa',
            description: 'Sweeping sunset views followed by seaside dinner.',
            estimatedCost: 3200,
            travelTime: '35 mins',
            transportMode: 'Cab',
            category: 'Sightseeing',
            lat: 15.603,
            lng: 73.736,
          },
        ],
        suggestedRestaurants: [
          { name: 'Viva Panjim', cuisine: 'Traditional Goan', estimatedCost: 1600, area: 'Fontainhas' },
        ],
      },
    ],
  },
  {
    tripId: 'demo_kyoto_autumn',
    userId: 'demo-local',
    origin: 'Bengaluru',
    destination: 'Kyoto',
    departureDate: '2026-10-05',
    returnDate: '2026-10-09',
    travellers: 2,
    budget: 145000,
    currency: 'INR',
    travelStyle: 'Cultural & Heritage',
    status: 'completed',
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-10-10T08:00:00.000Z',
    itinerary: [
      {
        day: 1,
        date: '2026-10-05',
        theme: 'Higashiyama Temples & Gion Evening',
        estimatedDayCost: 18500,
        activities: [
          {
            id: 'kyo-d1-1',
            timeSlot: 'morning',
            title: 'Kiyomizu-dera & Ninenzaka Stone Lanes',
            location: 'Higashiyama Ward, Kyoto',
            description: 'Early morning walk through preserved wooden machiya lanes.',
            estimatedCost: 2400,
            travelTime: '20 mins',
            transportMode: 'Keihan Rail',
            category: 'Cultural',
            lat: 34.9949,
            lng: 135.785,
          },
          {
            id: 'kyo-d1-2',
            timeSlot: 'afternoon',
            title: 'Nishiki Market Tasting & Tea Ceremony',
            location: 'Nakagyo Ward, Kyoto',
            description: 'Sample matcha sweets and historic Uji tea houses.',
            estimatedCost: 5200,
            travelTime: '15 mins',
            transportMode: 'Subway',
            category: 'Culinary',
            lat: 35.005,
            lng: 135.7649,
          },
          {
            id: 'kyo-d1-3',
            timeSlot: 'evening',
            title: 'Gion Shirakawa Lantern Walk',
            location: 'Gion, Kyoto',
            description: 'Canal-side willow walk and kaiseki dinner.',
            estimatedCost: 9000,
            travelTime: '10 mins',
            transportMode: 'Walk',
            category: 'Dining',
            lat: 35.0059,
            lng: 135.7745,
          },
        ],
        suggestedRestaurants: [
          { name: 'Gion Karyo', cuisine: 'Kaiseki', estimatedCost: 8500, area: 'Gion' },
        ],
      },
    ],
  },
];

export interface SavedDestItem {
  destinationId: string;
  destination: string;
  country: string;
  estimatedBudget?: number;
  savedAt: string;
}

interface TravelDataContextValue {
  trips: TripRecord[];
  conversations: ConversationRecord[];
  savedDestinations: SavedDestItem[];
  preferences: UserTravelPreferences;
  loadingData: boolean;
  saveTrip: (trip: TripRecord, isUpdate?: boolean) => Promise<void>;
  removeTrip: (tripId: string) => Promise<void>;
  saveConversation: (conv: ConversationRecord, isUpdate?: boolean) => Promise<void>;
  removeConversation: (conversationId: string) => Promise<void>;
  toggleSavedDestination: (item: {
    destinationId: string;
    destination: string;
    country: string;
    estimatedBudget?: number;
  }) => Promise<boolean>;
  updatePreferences: (prefs: UserTravelPreferences) => Promise<void>;
  recordRecoveryPlan: (plan: RecoveryPlanResult) => Promise<void>;
  confirmRecoveryPlan: (recoveryId: string, status: 'confirmed' | 'dismissed') => Promise<void>;
}

const TravelDataContext = createContext<TravelDataContextValue | undefined>(undefined);

export function TravelDataProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady, isCloudSynced } = useAuth();
  const [trips, setTrips] = useState<TripRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [savedDestinations, setSavedDestinations] = useState<SavedDestItem[]>([]);
  const [preferences, setPreferences] = useState<UserTravelPreferences>({
    userId: 'demo-local',
    preferredActivities: ['Beaches', 'Cultural', 'Local Cuisine'],
    budgetPreference: 'balanced',
    accommodationPreference: 'boutique',
    travelStyle: 'adventure',
    currency: 'INR',
  });
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authReady) return;

    if (isCloudSynced && user) {
      setLoadingData(true);
      const unsubTrips = subscribeUserTrips(
        user.uid,
        (items) => {
          setTrips(items);
          setLoadingData(false);
        },
        () => setLoadingData(false)
      );
      const unsubConvs = subscribeUserConversations(user.uid, (items) => {
        setConversations(items);
      });
      const unsubDests = subscribeSavedDestinations(user.uid, (items) => {
        setSavedDestinations(items);
      });
      getTravelPreferencesDoc(user.uid)
        .then((p) => {
          if (p) setPreferences(p);
          else
            setPreferences((prev) => ({
              ...prev,
              userId: user.uid,
            }));
        })
        .catch(() => {});

      return () => {
        unsubTrips();
        unsubConvs();
        unsubDests();
      };
    }

    // Local Demo Persistence Fallback
    try {
      const rawTrips = localStorage.getItem(LOCAL_TRIPS_KEY);
      if (rawTrips) {
        setTrips(JSON.parse(rawTrips));
      } else {
        setTrips(SEED_DEMO_TRIPS);
        localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(SEED_DEMO_TRIPS));
      }

      const rawConvs = localStorage.getItem(LOCAL_CONVS_KEY);
      setConversations(rawConvs ? JSON.parse(rawConvs) : []);

      const rawSaved = localStorage.getItem(LOCAL_SAVED_DEST_KEY);
      setSavedDestinations(rawSaved ? JSON.parse(rawSaved) : []);

      const rawPrefs = localStorage.getItem(LOCAL_PREFS_KEY);
      if (rawPrefs) setPreferences(JSON.parse(rawPrefs));
    } catch {
      setTrips(SEED_DEMO_TRIPS);
    }
    setLoadingData(false);
  }, [authReady, isCloudSynced, user]);

  const saveTrip = useCallback(
    async (trip: TripRecord, isUpdate = false) => {
      const record: TripRecord = {
        ...trip,
        userId: user?.uid || 'demo-local',
        updatedAt: new Date().toISOString(),
      };
      if (isCloudSynced && user) {
        await saveTripDoc(record, isUpdate);
        return;
      }
      setTrips((prev) => {
        const exists = prev.some((t) => t.tripId === record.tripId);
        const next = exists
          ? prev.map((t) => (t.tripId === record.tripId ? record : t))
          : [record, ...prev];
        localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [isCloudSynced, user]
  );

  const removeTrip = useCallback(
    async (tripId: string) => {
      if (isCloudSynced && user) {
        await deleteTripDoc(tripId);
        return;
      }
      setTrips((prev) => {
        const next = prev.filter((t) => t.tripId !== tripId);
        localStorage.setItem(LOCAL_TRIPS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [isCloudSynced, user]
  );

  const saveConversation = useCallback(
    async (conv: ConversationRecord, isUpdate = false) => {
      const record: ConversationRecord = {
        ...conv,
        userId: user?.uid || 'demo-local',
        updatedAt: new Date().toISOString(),
      };
      if (isCloudSynced && user) {
        await saveConversationDoc(record, isUpdate);
        return;
      }
      setConversations((prev) => {
        const exists = prev.some((c) => c.conversationId === record.conversationId);
        const next = exists
          ? prev.map((c) => (c.conversationId === record.conversationId ? record : c))
          : [record, ...prev];
        localStorage.setItem(LOCAL_CONVS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [isCloudSynced, user]
  );

  const removeConversation = useCallback(
    async (conversationId: string) => {
      if (isCloudSynced && user) {
        await deleteConversationDoc(conversationId);
        return;
      }
      setConversations((prev) => {
        const next = prev.filter((c) => c.conversationId !== conversationId);
        localStorage.setItem(LOCAL_CONVS_KEY, JSON.stringify(next));
        return next;
      });
    },
    [isCloudSynced, user]
  );

  const toggleSavedDestination = useCallback(
    async (item: {
      destinationId: string;
      destination: string;
      country: string;
      estimatedBudget?: number;
    }) => {
      const exists = savedDestinations.some((s) => s.destinationId === item.destinationId);
      if (isCloudSynced && user) {
        if (exists) {
          await removeSavedDestinationDoc(item.destinationId);
          return false;
        }
        await saveDestinationDoc(user.uid, item);
        return true;
      }
      setSavedDestinations((prev) => {
        const next = exists
          ? prev.filter((s) => s.destinationId !== item.destinationId)
          : [{ ...item, savedAt: new Date().toISOString() }, ...prev];
        localStorage.setItem(LOCAL_SAVED_DEST_KEY, JSON.stringify(next));
        return next;
      });
      return !exists;
    },
    [isCloudSynced, savedDestinations, user]
  );

  const updatePreferences = useCallback(
    async (prefs: UserTravelPreferences) => {
      const record: UserTravelPreferences = {
        ...prefs,
        userId: user?.uid || 'demo-local',
        updatedAt: new Date().toISOString(),
      };
      setPreferences(record);
      localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(record));
      if (isCloudSynced && user) {
        await saveTravelPreferencesDoc(record);
      }
    },
    [isCloudSynced, user]
  );

  const recordRecoveryPlan = useCallback(
    async (plan: RecoveryPlanResult) => {
      if (isCloudSynced && user) {
        await saveRecoveryPlanDoc(user.uid, plan);
      }
    },
    [isCloudSynced, user]
  );

  const confirmRecoveryPlan = useCallback(
    async (recoveryId: string, status: 'confirmed' | 'dismissed') => {
      if (isCloudSynced && user) {
        await updateRecoveryPlanStatusDoc(recoveryId, status);
      }
    },
    [isCloudSynced, user]
  );

  return (
    <TravelDataContext.Provider
      value={{
        trips,
        conversations,
        savedDestinations,
        preferences,
        loadingData,
        saveTrip,
        removeTrip,
        saveConversation,
        removeConversation,
        toggleSavedDestination,
        updatePreferences,
        recordRecoveryPlan,
        confirmRecoveryPlan,
      }}
    >
      {children}
    </TravelDataContext.Provider>
  );
}

export function useTravelData() {
  const ctx = useContext(TravelDataContext);
  if (!ctx) throw new Error('useTravelData must be used within TravelDataProvider');
  return ctx;
}
