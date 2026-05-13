# SESSION CONTEXT: WorldBet League Phase 3.3

## Auth Completeness + Infrastructure Planning

**Session Date**: 2026-05-13
**Version**: 3.3.0
**Status**: In Progress — infrastructure applied, backlog versioned, issues created

---

## What Changed in This Session

### Infrastructure Applied
- **`MIGRATION_LOG` table** created in `public` schema — audits every migration with version, name, description, script_path, applied_at, status
- **10 historical migrations registered** in MIGRATION_LOG (v1.0.0 → v3.3.0)
- **Trigger bug fixed** (`v3.2.1`): `handle_new_auth_user` now assigns role `user` (id=2) instead of nonexistent `cliente`

### Password Recovery (#8) — Verified Complete

The full flow was already implemented. One bug found and fixed:

- **Bug fixed**: `setNewPassword()` in `SupabaseAuthService` was calling `this._router.navigate(['/dashboard'])` after updating the password — but `/dashboard` does not exist and the component already handles navigation to `/home`. The service-level navigation was removed; routing is now solely the component's responsibility.

**Recovery flow (working):**
```
/change-password → ChangePasswordPage
  → requestPasswordReset(email) → Supabase sends recovery email
  → User clicks link → /auth/v1/callback#type=recovery
  → PASSWORD_RECOVERY event → router.navigate(['/set-password'])
  → SetPasswordPage: new password + confirm + validate
  → setNewPassword(newPassword) → supabase.auth.updateUser({ password })
  → Component navigates to /home on success
```

### User Sessions + IP (#10) — Already Done

`ip_address` column already exists in `USER_SESSION` (VARCHAR NOT NULL). `logSessionStart()` already stores the IP on every SIGNED_IN event. No migration needed.

### Backlog Organized
Full roadmap versioned — see table below.

---

## Roadmap

| Version | Theme | GitHub Issues |
|---------|-------|---------------|
| **v3.3** | Auth Completeness | #8 (password recovery), #9 (user profile), #10 (sessions + IP) |
| **v3.4** | Invitations | #11 (email invitations) |
| **v3.5** | Navigation & Admin | #12 (wallet navbar), #13 (approval flow) |
| **v3.6** | Search | #14 (global search) |
| **v3.7** | Real-time & Standings | #15 (standings WebSocket), #16 (schedule table) |
| **v3.8** | Interactive Diagrams | #17 (league bracket WebSocket) |
| **v3.9** | Mobile First | #18 (responsive design) |

---

## v3.3 Scope — Auth Completeness

### Features to Implement

#### 1. Password Recovery (#8)
```
User clicks "Olvidé mi contraseña"
    ↓
[auth.ts] Shows email input form
    ↓
[AuthFacade.resetPassword(email)]
    ↓
[SupabaseAuthService] → supabase.auth.resetPasswordForEmail(email, { redirectTo })
    ↓
Supabase sends recovery email
    ↓
User clicks link → lands on /reset-password?token=...
    ↓
[ResetPasswordComponent] Shows new-password + confirm form
    ↓
supabase.auth.updateUser({ password: newPassword })
    ↓
Success → redirect to /login with feedback
```

**Files to create/modify:**
- `src/app/shared/features/auth/auth.ts` — add resetPassword mode
- `src/app/shared/features/auth/auth.html` — conditional reset form
- `src/app/core/services/supabase-auth-service.ts` — add `resetPasswordForEmail()`, `updatePassword()`
- `src/app/shared/features/auth/auth.facade.ts` — expose reset methods
- Angular Router — add `/reset-password` public route

#### 2. User Profile (#9)
```
/profile (authGuard)
    ↓
ProfileFacade.loadProfile() → SELECT from USER WHERE user_id = get_my_user_id()
    ↓
ProfileComponent displays: name (editable), email (readonly), login (editable),
    registration_date, status, wallet balance
    ↓
On save: UPDATE public."USER" SET name=?, login=? WHERE user_id = get_my_user_id()
```

**Files to create:**
- `src/app/core/pages/profile/profile.ts`
- `src/app/core/pages/profile/profile.html`
- `src/app/core/pages/profile/profile.scss`
- `src/app/core/services/profile.service.ts`
- `src/app/shared/features/profile/profile.facade.ts`

#### 3. User Sessions + IP Tracking (#10)

**Migration needed:**
```sql
-- v3.3.1
ALTER TABLE public."USER_SESSION"
  ADD COLUMN IF NOT EXISTS ip_address INET;
```

**Flow:**
```
SIGNED_IN event (Supabase Auth)
    ↓
Angular intercepts onAuthStateChange
    ↓
INSERT into USER_SESSION (user_id, ip_address, login_at)
    ↓
On SIGNED_OUT: UPDATE USER_SESSION SET logout_at = NOW()
```

---

## Migration Log — v3.3 Migrations

| Version | Name | Description |
|---------|------|-------------|
| v3.3.0 | create_migration_log | Tabla MIGRATION_LOG para auditoría |
| v3.3.1 | add_ip_to_user_session | ADD COLUMN ip_address INET a USER_SESSION |

---

## DB Changes This Session

### MIGRATION_LOG (new)
```sql
CREATE TABLE public."MIGRATION_LOG" (
  migration_id  SERIAL PRIMARY KEY,
  version       TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  description   TEXT,
  script_path   TEXT,
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by    TEXT NOT NULL DEFAULT current_user,
  status        TEXT NOT NULL DEFAULT 'applied'
                  CHECK (status IN ('applied','rolled_back','failed')),
  checksum      TEXT,
  execution_ms  INT
);
```

---

## Compliance Status

- [x] Magic links for anonymous users (v3.0)
- [x] League creation + invitations (v3.0)
- [x] Prediction lock 15min before match (v3.0)
- [x] In-app notification inbox (v3.1)
- [x] Browser Notification API (v3.1)
- [x] Email/password user registration (v3.2)
- [x] Auto-provision USER + role + wallet on signup (v3.2)
- [x] Client-side confirm-password validation (v3.2)
- [x] Trigger bug fix — default role 'user' (v3.2.1)
- [x] Migration versioning table MIGRATION_LOG (v3.3.0)
- [ ] Password recovery flow (v3.3 — #8)
- [ ] User profile page (v3.3 — #9)
- [ ] USER_SESSION IP tracking (v3.3 — #10)

---

**Phase 3.3 Status**: In Progress
**Next Action**: Implement password recovery → user profile → sessions IP
