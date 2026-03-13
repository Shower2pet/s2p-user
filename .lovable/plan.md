

# Plan: Rating System + Account Self-Delete

## 1. Rating System (save to DB + display on station)

The rating UI already exists in `StationTimer.tsx` (step `rating`) but doesn't save anything. The `station_ratings` table and `get_station_avg_rating` RPC function already exist in Supabase.

### Changes

**A. `src/services/sessionService.ts`** — Add `submitRating()` function:
- Insert into `station_ratings` table (`station_id`, `session_id`, `user_id`, `rating`)
- Handle guest sessions (skip if no user)

**B. `src/pages/StationTimer.tsx`** — Wire up rating submission:
- When user taps a star, call `submitRating()` 
- Show toast on success
- Disable stars after submission

**C. `src/components/station/StationIdentityBlock.tsx`** — Display average rating:
- Call `get_station_avg_rating` RPC
- Show stars + count next to station name

**D. `src/config/translations.ts`** — Add keys:
- `ratingSubmitted`, `ratingError`, `reviews`

## 2. Account Self-Delete

Users cannot delete from `auth.users` client-side. Need a new Edge Function.

### Changes

**A. New Edge Function: `supabase/functions/delete-account/index.ts`**
- Validates JWT from Authorization header
- Uses service role client to call `auth.admin.deleteUser(userId)`
- Cascade on `profiles` FK handles cleanup automatically
- Returns 200 on success

**B. `supabase/config.toml`** — Add `[functions.delete-account]` with `verify_jwt = false` (manual JWT validation in code)

**C. `src/services/authService.ts`** — Add `deleteAccount()`:
- Calls `supabase.functions.invoke('delete-account')`

**D. `src/pages/Profile.tsx`** — Add delete account button + AlertDialog:
- Red "Delete Account" button at bottom
- Confirmation dialog with warning text
- On confirm: call `deleteAccount()`, clear state, redirect to `/`

**E. `src/config/translations.ts`** — Add keys:
- `deleteAccount`, `deleteAccountConfirm`, `deleteAccountDesc`, `deleteAccountSuccess`, `deleting`

## Technical Notes

- The `profiles` table has `ON DELETE CASCADE` from `auth.users`, so deleting the auth user cleans up profiles automatically
- `structure_wallets`, `wash_sessions`, `transactions` etc. reference `user_id` but don't cascade — the data stays for audit/history (user_id becomes orphaned UUID)
- Rating is only saved for authenticated users (guests skip)

