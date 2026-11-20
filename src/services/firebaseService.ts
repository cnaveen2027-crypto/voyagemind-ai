import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendEmailVerification,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  ConversationRecord,
  RecoveryPlanResult,
  TripRecord,
  UserTravelPreferences,
} from '../types/travel';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection validation on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration (client is offline).');
    }
  }
}
void testConnection();

export function sanitizeId(id: string): string {
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return clean || `id_${Date.now()}`;
}

function clampStr(val: string | undefined, max: number, fallback = ''): string {
  return (val ?? fallback).trim().slice(0, max);
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred.user;
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  if (cred.user.emailVerified) {
    await ensureUserProfile(cred.user);
  }
  return cred.user;
}

export async function registerWithEmail(name: string, email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await sendEmailVerification(cred.user);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function ensureUserProfile(user: User, homeAirport?: string): Promise<void> {
  if (!user.emailVerified) return;
  const uid = sanitizeId(user.uid);
  const path = `users/${uid}`;
  try {
    const ref = doc(db, 'users', uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid,
        name: clampStr(user.displayName || user.email?.split('@')[0] || 'Traveller', 120, 'Traveller'),
        email: clampStr(user.email || 'traveller@example.com', 254),
        ...(homeAirport ? { homeAirport: clampStr(homeAirport, 80) } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateUserProfileDoc(
  uid: string,
  data: { name: string; homeAirport?: string }
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    await updateDoc(doc(db, 'users', safeUid), {
      name: clampStr(data.name, 120, 'Traveller'),
      ...(data.homeAirport !== undefined ? { homeAirport: clampStr(data.homeAirport, 80) } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getUserProfileDoc(uid: string): Promise<{ name: string; email: string; homeAirport?: string } | null> {
  const safeUid = sanitizeId(uid);
  const path = `users/${safeUid}`;
  try {
    const snap = await getDoc(doc(db, 'users', safeUid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      name: String(d.name || 'Traveller'),
      email: String(d.email || ''),
      homeAirport: d.homeAirport ? String(d.homeAirport) : undefined,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveTravelPreferencesDoc(prefs: UserTravelPreferences): Promise<void> {
  const uid = sanitizeId(prefs.userId);
  const path = `travelPreferences/${uid}`;
  try {
    const ref = doc(db, 'travelPreferences', uid);
    const snap = await getDoc(ref);
    const payload = {
      userId: uid,
      preferredActivities: (prefs.preferredActivities || []).slice(0, 15).map((s) => clampStr(s, 40)),
      budgetPreference: prefs.budgetPreference,
      accommodationPreference: prefs.accommodationPreference,
      travelStyle: prefs.travelStyle,
      currency: prefs.currency,
      updatedAt: serverTimestamp(),
    };
    if (snap.exists()) {
      await updateDoc(ref, {
        preferredActivities: payload.preferredActivities,
        budgetPreference: payload.budgetPreference,
        accommodationPreference: payload.accommodationPreference,
        travelStyle: payload.travelStyle,
        currency: payload.currency,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, payload);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function getTravelPreferencesDoc(uid: string): Promise<UserTravelPreferences | null> {
  const safeUid = sanitizeId(uid);
  const path = `travelPreferences/${safeUid}`;
  try {
    const snap = await getDoc(doc(db, 'travelPreferences', safeUid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      userId: safeUid,
      preferredActivities: Array.isArray(d.preferredActivities) ? d.preferredActivities : [],
      budgetPreference: d.budgetPreference || 'balanced',
      accommodationPreference: d.accommodationPreference || 'hotel',
      travelStyle: d.travelStyle || 'adventure',
      currency: d.currency || 'INR',
      updatedAt: toIsoString(d.updatedAt),
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeUserTrips(
  uid: string,
  onData: (trips: TripRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'trips'), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const rows: TripRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          tripId: String(d.tripId || docSnap.id),
          userId: String(d.userId),
          origin: String(d.origin || ''),
          destination: String(d.destination || ''),
          departureDate: String(d.departureDate || ''),
          returnDate: String(d.returnDate || ''),
          travellers: Number(d.travellers || 1),
          budget: Number(d.budget || 0),
          currency: d.currency || 'INR',
          travelStyle: d.travelStyle ? String(d.travelStyle) : undefined,
          itinerary: Array.isArray(d.itinerary) ? d.itinerary : [],
          budgetBreakdown: d.budgetBreakdown || undefined,
          status: d.status || 'planned',
          createdAt: toIsoString(d.createdAt),
          updatedAt: toIsoString(d.updatedAt),
        };
      });
      rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      onData(rows);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'trips');
      } catch (e) {
        if (onError && e instanceof Error) onError(e);
      }
    }
  );
}

export async function saveTripDoc(trip: TripRecord, isUpdate = false): Promise<void> {
  const tripId = sanitizeId(trip.tripId);
  const userId = sanitizeId(trip.userId);
  const path = `trips/${tripId}`;
  try {
    const ref = doc(db, 'trips', tripId);
    const sanitizedItinerary = (trip.itinerary || []).slice(0, 30);
    const baseFields = {
      origin: clampStr(trip.origin, 120, 'Origin'),
      destination: clampStr(trip.destination, 120, 'Destination'),
      departureDate: clampStr(trip.departureDate, 32, '2026-12-01'),
      returnDate: clampStr(trip.returnDate, 32, '2026-12-05'),
      travellers: Math.max(1, Math.min(50, Math.round(trip.travellers || 1))),
      budget: Math.max(0, Math.min(100000000, Number(trip.budget) || 0)),
      currency: clampStr(trip.currency, 8, 'INR'),
      ...(trip.travelStyle ? { travelStyle: clampStr(trip.travelStyle, 64) } : {}),
      itinerary: sanitizedItinerary,
      ...(trip.budgetBreakdown ? { budgetBreakdown: trip.budgetBreakdown } : {}),
      status: trip.status || 'planned',
      updatedAt: serverTimestamp(),
    };

    if (isUpdate) {
      await updateDoc(ref, baseFields);
    } else {
      await setDoc(ref, {
        tripId,
        userId,
        ...baseFields,
        createdAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteTripDoc(tripId: string): Promise<void> {
  const safeId = sanitizeId(tripId);
  const path = `trips/${safeId}`;
  try {
    await deleteDoc(doc(db, 'trips', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeUserConversations(
  uid: string,
  onData: (conversations: ConversationRecord[]) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'conversations'), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ConversationRecord[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          conversationId: String(d.conversationId || docSnap.id),
          userId: String(d.userId),
          title: String(d.title || 'Travel Conversation'),
          messages: Array.isArray(d.messages) ? d.messages : [],
          createdAt: toIsoString(d.createdAt),
          updatedAt: toIsoString(d.updatedAt),
        };
      });
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      onData(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    }
  );
}

export async function saveConversationDoc(conv: ConversationRecord, isUpdate = false): Promise<void> {
  const conversationId = sanitizeId(conv.conversationId);
  const userId = sanitizeId(conv.userId);
  const path = `conversations/${conversationId}`;
  try {
    const ref = doc(db, 'conversations', conversationId);
    const boundedMessages = (conv.messages || []).slice(-100).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content.slice(0, 6000),
      timestamp: m.timestamp,
      ...(m.groundingLinks ? { groundingLinks: m.groundingLinks.slice(0, 10) } : {}),
    }));

    if (isUpdate) {
      await updateDoc(ref, {
        title: clampStr(conv.title, 160, 'Travel Conversation'),
        messages: boundedMessages,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        conversationId,
        userId,
        title: clampStr(conv.title, 160, 'Travel Conversation'),
        messages: boundedMessages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteConversationDoc(conversationId: string): Promise<void> {
  const safeId = sanitizeId(conversationId);
  try {
    await deleteDoc(doc(db, 'conversations', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `conversations/${safeId}`);
  }
}

export function subscribeSavedDestinations(
  uid: string,
  onData: (items: { destinationId: string; destination: string; country: string; estimatedBudget?: number; savedAt: string }[]) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'savedDestinations'), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            destinationId: String(d.destinationId || docSnap.id),
            destination: String(d.destination),
            country: String(d.country),
            estimatedBudget: typeof d.estimatedBudget === 'number' ? d.estimatedBudget : undefined,
            savedAt: toIsoString(d.savedAt),
          };
        })
      );
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'savedDestinations');
    }
  );
}

export async function saveDestinationDoc(
  uid: string,
  item: { destinationId: string; destination: string; country: string; estimatedBudget?: number }
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeDestId = sanitizeId(item.destinationId);
  const path = `savedDestinations/${safeDestId}`;
  try {
    await setDoc(doc(db, 'savedDestinations', safeDestId), {
      destinationId: safeDestId,
      userId: safeUid,
      destination: clampStr(item.destination, 120),
      country: clampStr(item.country, 80),
      ...(typeof item.estimatedBudget === 'number' ? { estimatedBudget: item.estimatedBudget } : {}),
      savedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function removeSavedDestinationDoc(destinationId: string): Promise<void> {
  const safeId = sanitizeId(destinationId);
  try {
    await deleteDoc(doc(db, 'savedDestinations', safeId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `savedDestinations/${safeId}`);
  }
}

export async function saveRecoveryPlanDoc(
  uid: string,
  plan: RecoveryPlanResult
): Promise<void> {
  const safeUid = sanitizeId(uid);
  const safeRecId = sanitizeId(plan.recoveryId);
  const safeTripId = sanitizeId(plan.tripId);
  const path = `recoveryPlans/${safeRecId}`;
  try {
    await setDoc(doc(db, 'recoveryPlans', safeRecId), {
      recoveryId: safeRecId,
      tripId: safeTripId,
      userId: safeUid,
      disruptionType: plan.disruptionType,
      originalPlan: plan.originalArrangement,
      alternativePlan: plan.recommendedAlternative,
      costDifference: clampStr(plan.costDifference, 80),
      timeDifference: clampStr(plan.timeDifference, 80),
      status: 'pending_confirmation',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateRecoveryPlanStatusDoc(
  recoveryId: string,
  status: 'confirmed' | 'dismissed'
): Promise<void> {
  const safeId = sanitizeId(recoveryId);
  try {
    await updateDoc(doc(db, 'recoveryPlans', safeId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `recoveryPlans/${safeId}`);
  }
}
