# Supabase Edge Functions - Secrets Setup

## Príkazy na nastavenie Secrets

### 1. Nastavenie RESEND_API_KEY (pre všetky e-mailové funkcie)

```bash
# Pre lokálny vývoj (ak používaš Supabase CLI)
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pre produkciu (cez Supabase Dashboard)
# Choď na: Project Settings > Edge Functions > Secrets
# Pridaj: RESEND_API_KEY = tvoj_resend_api_key
```

### 2. Nastavenie SUPABASE_SERVICE_ROLE_KEY (pre inter-funkčné volania)

```bash
# Pre lokálny vývoj
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pre produkciu
# Choď na: Project Settings > API > Service Role Key
# Skopíruj Service Role Key a nastav ho ako secret
```

### 3. Nastavenie STRIPE_WEBHOOK_SECRET (pre Stripe webhook verification)

```bash
# Pre lokálny vývoj
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Pre produkciu
# Získaš z Stripe Dashboard > Webhooks > Signing secret
```

### 4. Nastavenie SITE_URL (voliteľné, pre tracking linky)

```bash
# Pre lokálny vývoj
npx supabase secrets set SITE_URL=https://remappro.eu

# Pre produkciu
# Toto je už nastavené v kóde ako fallback, ale môžeš to explicitne nastaviť
```

## Kontrola nastavených Secrets

```bash
# Zobrazenie všetkých secrets (lokálne)
npx supabase secrets list

# V produkcii
# Choď na: Project Settings > Edge Functions > Secrets
```

## Dôležité poznámky

1. **RESEND_API_KEY** musí byť nastavený pre všetky funkcie, ktoré posielajú e-maily:
   - `send-order-confirmation`
   - `generate-invoice`
   - `send-status-email`
   - `send-order-ready`
   - `send-completion-email`
   - `stripe-webhook` (pre admin notifikácie)

2. **SUPABASE_SERVICE_ROLE_KEY** sa používa pre:
   - Inter-funkčné volania (stripe-webhook volá generate-invoice a send-order-confirmation)
   - Prístup k databáze bez RLS obmedzení

3. Po nastavení secrets musíš **redeployovať** Edge funkcie:
   ```bash
   npx supabase functions deploy stripe-webhook
   npx supabase functions deploy send-order-confirmation
   npx supabase functions deploy generate-invoice
   ```

## Riešenie problémov

### Invalid JWT (401)
- Skontroluj, či je `SUPABASE_SERVICE_ROLE_KEY` správne nastavený
- Skontroluj, či používaš správny kľúč (nie anon key, ale service role key)

### Missing required invoice data
- Skontroluj logy v Supabase Dashboard > Edge Functions > Logs
- Uisti sa, že `stripe-webhook` posiela všetky potrebné údaje

### RESEND_API_KEY invalid
- Skontroluj, či je API kľúč aktívny v Resend Dashboard
- Skontroluj, či je doména `remappro.eu` overená v Resend
