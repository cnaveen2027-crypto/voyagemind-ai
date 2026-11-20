/**
 * VoyageMind AI - Dirty Dozen Firestore Security Rules Verification Suite
 * Defines the 12 adversarial payloads that must evaluate to PERMISSION_DENIED
 * under firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Trip Read',
    operation: 'get',
    path: '/trips/trip_001',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User PII Leak',
    operation: 'get',
    path: '/users/user_victim',
    auth: { uid: 'user_attacker', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/trips/trip_002',
    auth: { uid: 'user_a', email_verified: false },
    payload: { tripId: 'trip_002', userId: 'user_a', origin: 'Chennai', destination: 'Goa' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Identity Spoofing on Trip Create',
    operation: 'create',
    path: '/trips/trip_003',
    auth: { uid: 'user_attacker', email_verified: true },
    payload: { tripId: 'trip_003', userId: 'user_victim', origin: 'Delhi', destination: 'Paris' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Shadow Field Injection on Profile',
    operation: 'create',
    path: '/users/user_a',
    auth: { uid: 'user_a', email_verified: true },
    payload: { uid: 'user_a', name: 'Alex', email: 'alex@example.com', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Path Variable ID Poisoning',
    operation: 'create',
    path: `/trips/${'a'.repeat(200)}`,
    auth: { uid: 'user_a', email_verified: true },
    payload: { tripId: 'bad', userId: 'user_a' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Denial-of-Wallet String Bloat',
    operation: 'create',
    path: '/trips/trip_004',
    auth: { uid: 'user_a', email_verified: true },
    payload: { tripId: 'trip_004', userId: 'user_a', origin: 'X'.repeat(5000), destination: 'Goa' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unbounded Array Injection',
    operation: 'create',
    path: '/travelPreferences/user_a',
    auth: { uid: 'user_a', email_verified: true },
    payload: {
      userId: 'user_a',
      preferredActivities: Array.from({ length: 50 }, (_, i) => `activity_${i}`),
      budgetPreference: 'balanced',
      accommodationPreference: 'hotel',
      travelStyle: 'adventure',
      currency: 'INR',
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable Owner Tampering on Update',
    operation: 'update',
    path: '/trips/trip_001',
    auth: { uid: 'user_a', email_verified: true },
    payload: { userId: 'user_b' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Client Timestamp Forgery',
    operation: 'create',
    path: '/trips/trip_005',
    auth: { uid: 'user_a', email_verified: true },
    payload: { tripId: 'trip_005', userId: 'user_a', createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Terminal State Bypass on Confirmed Recovery Plan',
    operation: 'update',
    path: '/recoveryPlans/rec_001',
    auth: { uid: 'user_a', email_verified: true },
    payload: { status: 'pending_confirmation' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unscoped Blanket List Query',
    operation: 'list',
    path: '/trips',
    auth: { uid: 'user_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
