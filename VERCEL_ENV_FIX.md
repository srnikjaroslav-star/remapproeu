# Vercel Environment Variables Fix

## Current Status
✅ Supabase client/server files are correct - they only use:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

✅ ShareLinkButton updated to use `NEXT_PUBLIC_SITE_URL` with fallback to `window.location.origin`

## Vercel Environment Variables - What You Need

### Required Variables (Keep These):

1. **NEXT_PUBLIC_SUPABASE_URL**
   - Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - Should already exist and be correct

2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - Value: Your Supabase anon/public key
   - Should already exist and be correct

3. **NEXT_PUBLIC_SITE_URL** (NEW - Add This)
   - Value: `https://tabulka-modern.vercel.app`
   - This ensures share links use production URL

### Action Required in Vercel:

1. **Delete the wrongly named variable:**
   - Find and DELETE: `ĎALŠIA_VEREJNÁ_URL_ZÁKLADNEJ_ADRESY_SU....` (or similar)
   - This variable is not used by the code and should be removed

2. **Add NEXT_PUBLIC_SITE_URL:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Click "Add New"
   - Name: `NEXT_PUBLIC_SITE_URL`
   - Value: `https://tabulka-modern.vercel.app`
   - Apply to: Production, Preview, Development (all environments)

3. **Verify existing variables:**
   - Ensure `NEXT_PUBLIC_SUPABASE_URL` exists and has correct value
   - Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` exists and has correct value

4. **Redeploy:**
   - After adding/changing variables, trigger a new deployment
   - Or wait for next commit to auto-deploy

## How It Works Now:

- **ShareLinkButton**: Uses `NEXT_PUBLIC_SITE_URL` if available, otherwise `window.location.origin`
- **Supabase Client**: Only uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Realtime**: Works on production domain automatically (uses Supabase URL from env var)

## Testing:

After deployment, test the Share Link button - it should generate:
`https://tabulka-modern.vercel.app/portal/[slug]`

NOT `http://localhost:3000/portal/[slug]`
