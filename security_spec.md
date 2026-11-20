# VoyageMind AI Firestore Security Specification

## 1. Data Invariants
1. **Owner-Only PII Isolation**: A user profile (`/users/{userId}`) containing `email` and personal details can only be read, created, or updated by the verified authenticated user whose `request.auth.uid == userId`.
2. **Preferences Isolation**: `/travelPreferences/{userId}` can only be read or modified by the verified owner (`request.auth.uid == userId`) with bounded activity arrays (`size() <= 15`).
3. **Trip Ownership & Relational Integrity**: Every trip (`/trips/{tripId}`) must carry `userId == request.auth.uid`. Updates cannot change `userId`, `tripId`, or `createdAt`, and completed trips are terminal-locked unless explicitly reopened via allowed fields.
4. **Conversation Thread Ownership**: Copilot conversations (`/conversations/{conversationId}`) must belong to `request.auth.uid` and contain at most 100 bounded messages.
5. **Saved Destination Ownership**: Bookmarks (`/savedDestinations/{savedId}`) must carry `userId == request.auth.uid`.
6. **Recovery Plan Referential Integrity**: Every recovery plan (`/recoveryPlans/{recoveryId}`) must reference an existing parent trip owned by `request.auth.uid`, and cannot mutate once `status == 'confirmed'` or `'dismissed'`.
7. **Temporal Integrity**: All `createdAt`, `updatedAt`, and `savedAt` timestamps must match `request.time` (`serverTimestamp()`).

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Trip Read**: `GET /trips/trip_1` with `auth == null`.
2. **Cross-User PII Leak**: `GET /users/other_uid` with `auth.uid == 'user_a'`.
3. **Unverified Email Spoofing**: `CREATE /trips/trip_2` with `auth.uid == 'user_a'`, `email_verified: false`.
4. **Identity Spoofing on Trip Create**: `CREATE /trips/trip_3` with `userId: 'victim_uid'` while `auth.uid == 'attacker_uid'`.
5. **Shadow Field Injection**: `CREATE /users/user_a` with extra ghost field `isAdmin: true`.
6. **ID Poisoning**: `CREATE /trips/../../etc/passwd` or 500-char document ID failing `isValidId()`.
7. **Denial-of-Wallet String Bloat**: `CREATE /trips/trip_4` with `origin` of 5,000 characters.
8. **Unbounded Array Injection**: `CREATE /travelPreferences/user_a` with 50 items in `preferredActivities`.
9. **Immutable Owner Tampering**: `UPDATE /trips/trip_1` changing `userId` to `'other_uid'`.
10. **Client Timestamp Forgery**: `CREATE /trips/trip_5` with backdated client timestamp instead of `request.time`.
11. **Terminal State Bypass on Recovery Plan**: `UPDATE /recoveryPlans/rec_1` when existing `status == 'confirmed'`.
12. **Blanket List Query Scraping**: `LIST /trips` without filtering `resource.data.userId == request.auth.uid`.
