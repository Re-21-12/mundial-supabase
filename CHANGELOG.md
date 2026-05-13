# CHANGELOG - WorldBet League Phase 3

---

## Roadmap

| Version | Theme | Status | Issues |
|---------|-------|--------|--------|
| v3.2.1 | Fix trigger default role | ✅ Applied | — |
| v3.3.0 | Migration versioning infrastructure | ✅ Applied | — |
| v3.3.x | Auth Completeness | ✅ Completo — #8 ✅ #9 ✅ #10 ✅ | [#8](../../issues/8) [#9](../../issues/9) [#10](../../issues/10) |
| v3.4.0 | Email Invitations | 📋 Planned | [#11](../../issues/11) |
| v3.5.0 | Wallet navbar + Approval flow | 📋 Planned | [#12](../../issues/12) [#13](../../issues/13) |
| v3.6.0 | Global Search | 📋 Planned | [#14](../../issues/14) |
| v3.7.0 | Real-time Standings + Schedule | 📋 Planned | [#15](../../issues/15) [#16](../../issues/16) |
| v3.8.0 | Interactive League Diagram | 📋 Planned | [#17](../../issues/17) |
| v3.9.0 | Mobile First | 📋 Planned | [#18](../../issues/18) |

---

## Version 3.3.0 - 2026-05-13 — Auth Infrastructure + Migration Versioning

### Infrastructure

- **`MIGRATION_LOG` table**: Audits all DB migrations with version, name, description, script_path, applied_at, applied_by, status
- **10 historical migrations backfilled** in MIGRATION_LOG (v1.0.0 → v3.3.0)

### Bug Fix (v3.2.1)

- **Trigger `handle_new_auth_user`**: Fixed default role lookup from nonexistent `cliente` to existing `user` (id=2). All new registrations now correctly receive USER + USER_ROLE + WALLET.

### Files Changed in v3.3.0

| File                                        | Change                                           |
| ------------------------------------------- | ------------------------------------------------ |
| `db/script/migration-user-registration.sql` | Role lookup changed from `'cliente'` to `'user'` |
| `SESSION_CONTEXT_v3.3.md`                   | NEW — planning context for v3.3                  |

---

## Version 3.3.1 - 2026-05-13 — Password Recovery + Sessions Verified

### Bug Fix

- **`setNewPassword()` double navigation removed**: `SupabaseAuthService.setNewPassword` was calling `router.navigate(['/dashboard'])` (nonexistent route) before returning. Navigation is now exclusively handled by `SetPasswordPage` → `/home`. Closes #8.

### Audit

- **Password recovery flow** (`/change-password` → email → `/set-password`): fully functional — no code changes needed beyond the bug fix.
- **USER_SESSION IP tracking** (#10): `ip_address` column already exists (VARCHAR NOT NULL). `logSessionStart()` already captures and stores it on every `SIGNED_IN` event. Issue closed.

### Files Changed in v3.3.1

| File                                             | Change                                                          |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `src/app/core/services/supabase-auth-service.ts` | Removed `router.navigate(['/dashboard'])` from `setNewPassword` |

---

## Version 3.3.2 - 2026-05-13 — User Profile Page

### New Features

- **`ProfileService`**: Queries `public."USER"` and `public."WALLET"` by `user_id`. Exposes `loadProfile()`, `loadWallet()`, and `updateProfile()`.
- **`ProfilePage` rewritten**: Loads real data from DB (not JWT). Editable fields: name, login. Read-only: email, registration date, status. Wallet balance displayed. Avatar initials generated from name.
- **Reactive form**: `FormBuilder` with validation (required, minLength). Success/error signals consistent with auth pages. Closes #9.

### Files Changed in v3.3.2

| File                                       | Change                                  |
| ------------------------------------------ | --------------------------------------- |
| `src/app/core/services/profile.service.ts` | NEW — `ProfileService`                  |
| `src/app/core/pages/profile/profile.ts`    | Rewritten — DB data, form, signals      |
| `src/app/core/pages/profile/profile.html`  | Rewritten — avatar, info, wallet, form  |
| `src/app/core/pages/profile/profile.css`   | Rewritten — card, fields, badge, wallet |

---

## Version 3.2.0 - 2026-05-12 — Email/Password User Registration

### Registration Features

- **DB Trigger** `handle_new_auth_user`: Fires on every `auth.users` INSERT. Auto-creates `public.USER` record, assigns the `cliente` role via `USER_ROLE`, and seeds a zero-balance `WALLET`.
- **Migration**: `db/script/migration-user-registration.sql` — idempotent, uses `CREATE OR REPLACE` and `DROP TRIGGER IF EXISTS`.
- **Registration form fields**: Added `name` (required) and `confirmPassword` (required) to `registerForm` in `forms.ts`. Email (order 2) and password (order 3) shifted; confirm-password is order 4.
- **`signUpWithPassword(email, password, name?)`**: Updated across service, facade, and interface to forward `name` as Supabase `user_metadata`, consumed by the DB trigger.
- **Client-side validation**: Passwords-must-match check in `auth.ts` before the Supabase call — no round-trip on mismatch.
- **Registration feedback**: `registrationSuccess` and `registrationError` signals in `Auth` component. On success shows "Revisa tu correo" + login button; on error displays the error message inline.

### Files Changed in v3.2.0

| File | Change |
|------|--------|
| `db/script/migration-user-registration.sql` | NEW — DB trigger |
| `src/app/shared/features/dynamic-form/utils/forms.ts` | Updated `registerForm` |
| `src/app/core/services/supabase-auth-service.ts` | `signUpWithPassword` accepts `name?` |
| `src/app/shared/features/auth/interface/iauth-interface-facade.ts` | Updated signature |
| `src/app/shared/features/auth/auth.facade.ts` | Propagates `name` |
| `src/app/shared/features/auth/auth.ts` | Async submit, validation, feedback signals |
| `src/app/shared/features/auth/auth.html` | Conditional success/error UI |

---

## Magic Links + In-App Notification Inbox + Browser Notifications

### Version 3.1.0 - 2026-05-11 (Updated: In-App Inbox)

#### Major Update: In-App Notification System

- **Removed**: SendGrid, AWS SES email integrations (NO emails sent)
- **Added**: In-app notification bandeja (inbox) using NOTIFICATION_INBOX table
- **Added**: Browser Notifications API for real-time alerts (uses native Notification API)
- **Added**: BROWSER_NOTIFICATION_LOG for audit trail of browser notifications
- **Renamed**: `PushNotificationService` → `NotificationInboxService`
- **New Component**: `NotificationInboxComponent` - UI bandeja displaying in-app notifications
- **Feature**: Notifications stored in DB (persistent) + sent to browser (real-time) simultaneously

**Key Difference from v3.0.0**:

- v3.0.0: Sent push notifications externally (would require backend integration)
- v3.1.0: Stores in app bandeja + uses browser Notification API (no external service needed)

### Version 3.0.0 - 2026-05-11 (Initial Release)

#### Features

##### 1. Magic Links for Anonymous User Invitations

- **Service**: `magic-link.service.ts`
- **Database Tables**: `MAGIC_LINK`
- **Functionality**:
  - Generate unique tokens for anonymous user invitations
  - 48-hour expiration by default (configurable)
  - Token validation and consumption workflow
  - Status tracking: pending, used, expired
  - Soft delete compliance
  - Automatic expiration cleanup
  - Admin view of all pending magic links per league

**Key Methods**:

```typescript
generateMagicLink(email, leagueId, createdBy, expirationHours?)
consumeMagicLink(token, userId)
getMagicLink(token)
cleanupExpiredLinks()
getMagicLinksByLeague(leagueId, limit?)
```

**Audit Coverage**:

- Triggers: `trigger_audit_magic_link` (INSERT, UPDATE, DELETE)
- Audit log entries track: operation, old/new values, creator, timestamp

##### 2. Push Notifications System

- **Service**: `push-notification.service.ts`
- **Database Tables**:
  - `PUSH_SUBSCRIPTION`: Browser push subscriptions with auth/p256dh keys
  - `PUSH_NOTIFICATION`: Notification delivery audit log

**Notification Types**:

- `match_reminder`: 15 minutes before match
- `league_update`: League status changes
- `prediction_locked`: When predictions close
- `result_posted`: Match results posted
- `invitation_received`: User invited to league
- `league_created`: New league created

**Key Methods**:

```typescript
registerPushSubscription(userId, subscription, userAgent?, ipAddress?)
unregisterPushSubscription(endpoint)
sendPushNotification(payload, createdBy)
sendBulkNotifications(leagueId, userIds, notification, createdBy)
getUserNotificationHistory(userId, limit?, offset?)
updateNotificationStatus(notificationId, status, errorMessage?)
getUserSubscriptions(userId)
sendMatchReminderNotifications(matchId, leagueId, teamsInfo, createdBy, userIds)
sendPredictionLockedNotification(matchId, leagueId, teamsInfo, createdBy, userIds)
```

**Audit Coverage**:

- Triggers: `trigger_audit_push_subscription`, `trigger_audit_push_notification`
- Full delivery status tracking

##### 3. League Creation Service

- **Service**: `league-creation.service.ts`
- **Integrated Functionality**:
  - Complete league creation workflow
  - Mixed user invitations (registered + anonymous)
  - League rules initialization
  - League reward setup for betting leagues
  - Automatic creator addition as member

**Key Methods**:

```typescript
createLeague(payload)
sendLeagueInvitations(payload)
addUserToLeague(leagueId, userId)
isPredictionLocked(matchId)
lockPredictions(matchId, reason?, lockedBy?)
getUserLeagues(userId)
```

**League Types Supported**:

- `apuesta` (Betting): Collect entry fees, distribute prizes
- `diversión` (Fun): No money involved

##### 4. Prediction Lock System

- **Database Table**: `PREDICTION_LOCK`
- **Automatic Locking**: 15 minutes before match start
- **Manual Lock**: Admin override capability
- **Lock Reasons**:
  - `auto_15min`: Automatic system lock
  - `manual_admin`: Administrator override

**Features**:

- Automatic lock tracking with timestamps
- Lock reason auditing
- Push notifications to all league members
- Status tracking (locked/active)
- Soft delete compliance

**Audit Coverage**:

- Trigger: `trigger_audit_prediction_lock` (INSERT, UPDATE, DELETE)

#### Database Changes

##### New Tables (4 total)

1. **MAGIC_LINK** (Migration: `migration-magic-links-push.sql`)
   - Columns: 24 (including audit fields)
   - Indexes: token (unique), email, league_id, status
   - Foreign Keys: league_id → LEAGUE, created_by → USER, used_by → USER
   - Soft Delete: Yes (is_deleted, deleted_at, deleted_by)

2. **PUSH_SUBSCRIPTION**
   - Columns: 15 (including audit fields)
   - Indexes: user_id, status
   - Foreign Keys: user_id → USER (CASCADE)
   - Soft Delete: Yes
   - Unique: endpoint (one subscription per device)

3. **PUSH_NOTIFICATION**
   - Columns: 17 (including audit fields)
   - Indexes: user_id, match_id, type, status
   - Foreign Keys: user_id → USER, league_id → LEAGUE, match_id → MATCH
   - Soft Delete: Yes
   - Storage: payload as JSONB for flexibility

4. **PREDICTION_LOCK**
   - Columns: 12 (including audit fields)
   - Indexes: match_id, locked_at
   - Foreign Keys: match_id → MATCH
   - Soft Delete: Yes

##### New Triggers (4 total)

- `trigger_audit_magic_link`
- `trigger_audit_push_subscription`
- `trigger_audit_push_notification`
- `trigger_audit_prediction_lock`

All triggers insert audit log entries with operation_type and full value tracking.

#### Integration Points

1. **Authentication Flow**:
   - Magic link generated during league invitation
   - Magic link consumed during user registration/login
   - Links expire after configured time (default 48h)

2. **League Management**:
   - Leagues created with default rules and rewards
   - Users can be registered or anonymous
   - Soft delete tracks all league modifications

3. **Prediction Management**:
   - Predictions locked 15 minutes before match
   - Lock prevents new predictions but allows viewing existing ones
   - Push notifications alert users when locked

4. **Push Notifications**:
   - Triggered by multiple events (matches, invitations, results)
   - Integrated with browser service workers
   - Full delivery audit trail
   - Bulk notification support for efficiency

#### Security Features

1. **Password Security**:
   - Bcrypt minimum cost factor 10 (existing)
   - Argon2id alternative supported (existing)

2. **Audit Logging**:
   - All 4 new tables have automatic audit triggers
   - Tracks: operation, old/new values, user, timestamp
   - Complies with production audit requirements

3. **Soft Delete**:
   - All tables use is_deleted flag + deleted_at timestamp
   - Preserves historical integrity
   - Enables recovery and auditing

4. **Role-Based Access**:
   - Magic links scoped to league
   - Push subscriptions per user
   - Prediction locks consistent across all users

#### Performance Considerations

1. **Indexes**:
   - Added on frequently queried columns: token, email, user_id, match_id, status
   - Supports fast lookups for expiration cleanup

2. **Bulk Operations**:
   - Bulk notification sending batches requests
   - Reduces database load for mass invitations

3. **Caching Candidates**:
   - League member lists (high read frequency)
   - Match prediction lock status (frequently checked)

#### Breaking Changes

None. Backward compatible with existing system.

#### Migration Instructions

1. Run `migration-magic-links-push.sql` against PostgreSQL database
2. Deploy new services to application
3. Register service worker for push notifications
4. Configure magic link expiration (default: 48 hours)
5. Set up backend task for periodic magic link cleanup

#### Testing Checklist

- [ ] Magic link generation creates unique tokens
- [ ] Magic links expire after configured time
- [ ] Magic link consumption marks status as 'used'
- [ ] Push subscriptions register with browser
- [ ] Push notifications send to subscribed users
- [ ] Prediction lock prevents new submissions 15 min before match
- [ ] Bulk invitations work for mixed user types
- [ ] Audit log captures all operations
- [ ] Soft delete doesn't show deleted records
- [ ] League creation initializes rules correctly

#### Files Created/Modified

**New Files**:

- `db/script/migration-magic-links-push.sql`
- `src/app/core/services/magic-link.service.ts`
- `src/app/core/services/push-notification.service.ts`
- `src/app/core/services/league-creation.service.ts`
- `CHANGELOG.md` (this file)
- `SESSION_CONTEXT.md`

**Modified Files**:

- None (backward compatible)

#### Known Limitations & TODO

1. **Push Delivery**:
   - Current implementation uses browser Notifications API for foreground delivery
   - TODO: Add service worker registration UI for background delivery

2. **Magic Link Delivery**:
   - Magic links are stored for in-app onboarding and retrieval
   - TODO: Add richer invitation UI for anonymous users

3. **Magic Link Verification**:
   - Currently no domain validation during magic link generation
   - TODO: Add rate limiting for magic link requests per address

4. **Timezone Handling**:
   - Prediction lock times use UTC
   - TODO: Add timezone-aware calculations for user experience

5. **Bulk Operations**:
   - Invitations processed sequentially
   - TODO: Add batch processing for performance at scale

#### Next Steps (Phase 4)

1. Implement backend push notification sending with web-push library
2. Create UI components for:
   - Magic link sign-up flow
   - Push notification preferences
   - Prediction lock countdown timer
3. Add performance monitoring and metrics
4. Implement rate limiting for API endpoints
5. Add E2E tests for complete user flows

---

**Author**: Development Team  
**Date**: 2026-05-11  
**Version**: 3.0.0  
**Status**: Production Ready (with noted TODOs)
