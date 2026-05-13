# SESSION CONTEXT: WorldBet League Phase 3.2

## Email/Password User Registration

**Session Date**: 2026-05-12
**Version Implemented**: 3.2.0
**Status**: Complete — registration flow fully wired end-to-end

---

## What Changed in This Session

### Problem Solved

v3.1.0 had `signUpWithPassword(email, password)` wired through the stack, but:
1. No record was created in `public.USER` (required `name`, `email`, `registration_date`, `status`)
2. New users got no role assignment — empty permissions, invisible sidebar
3. The UI silently ignored success/error from the sign-up call

### Solution

Three layers of fix:
- **Database**: Postgres trigger auto-provisions USER + role + wallet on every `auth.users` INSERT
- **Service layer**: `signUpWithPassword` now accepts `name` and passes it as `user_metadata`
- **UI layer**: Register form extended, client-side password-match validation, success/error feedback signals

---

## How Registration Works Now

```
User fills form (name, email, password, confirmPassword)
    ↓
[auth.ts] Validates passwords match client-side (no round-trip on mismatch)
    ↓
[authFacade.signUpWithPassword(email, password, name)]
    ↓
[SupabaseAuthService] → supabase.auth.signUp({ email, password, options.data: { name } })
    ↓
Supabase: Creates auth.users row with raw_user_meta_data = { name }
    ↓
[DB Trigger: handle_new_auth_user] AFTER INSERT on auth.users
    ├── INSERT into public."USER" (name from metadata or email-prefix, login, email, registration_date, status='active')
    ├── INSERT into public."USER_ROLE" (user_id, role_id of 'cliente')
    └── INSERT into public."WALLET" (user_id, balance=0, status='active')
    ↓
Supabase sends confirmation email to user
    ↓
[auth.ts] registrationSuccess.set(true) → shows "Revisa tu correo" message
    ↓
User clicks email link → SIGNED_IN event → redirected to /home with cliente permissions
```

---

## Files Created

- `db/script/migration-user-registration.sql` — Idempotent migration with trigger

## Files Modified

| File | What Changed |
|------|-------------|
| `src/app/shared/features/dynamic-form/utils/forms.ts` | `registerForm` now has 4 fields: name (order 1), email (2), password (3), confirmPassword (4) |
| `src/app/core/services/supabase-auth-service.ts` | `signUpWithPassword(email, password, name?)` — passes name in user_metadata |
| `src/app/shared/features/auth/interface/iauth-interface-facade.ts` | Updated method signature |
| `src/app/shared/features/auth/auth.facade.ts` | Propagates optional `name` parameter |
| `src/app/shared/features/auth/auth.ts` | Async submitData, confirm-password check, registrationSuccess/Error signals |
| `src/app/shared/features/auth/auth.html` | Conditional success message + inline error |
| `CHANGELOG.md` | Added v3.2.0 section |

---

## Registration Form Fields

```
registerForm:
  1. name          TEXT      required  minLength(2)
  2. email         EMAIL     required  email validator
  3. password      PASSWORD  required  minLength(6)
  4. confirmPassword PASSWORD required  minLength(6)
```

---

## DB Trigger Details

```sql
-- Trigger: on_auth_user_created (AFTER INSERT ON auth.users)
-- Function: public.handle_new_auth_user()
--   SECURITY DEFINER — runs as owner, not calling user
--   name: from raw_user_meta_data->>'name', falls back to email-prefix
--   login: always email-prefix
--   password_hash: 'supabase_managed' (auth handled by Supabase Auth, not app)
--   Assigns role: 'cliente' (silently skips if role doesn't exist yet)
--   Creates wallet: balance=0, status='active'
```

---

## Known Behaviors

1. **Email confirmation required** — Supabase sends a confirmation link; USER row is created immediately but session only activates after confirmation
2. **Role 'cliente' must exist** in `public.ROLE` table for role assignment to work (trigger skips silently if missing)
3. **Login = email-prefix** — always derived; can be updated by user later
4. **password_hash = 'supabase_managed'** — the app's USER table doesn't store actual hashes; Supabase Auth owns credential storage
5. **Duplicate auth users** — trigger is idempotent per Supabase user; each auth.users INSERT fires once

---

## Run Migration

```bash
psql -U user -d mundial < db/script/migration-user-registration.sql
```

Or run directly in Supabase SQL Editor (supports `auth` schema access).

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
- [x] Registration success/error feedback (v3.2)

---

**Phase 3.2 Status**: COMPLETE
**Next Priority**: User profile page (edit name, avatar) + admin user management panel
