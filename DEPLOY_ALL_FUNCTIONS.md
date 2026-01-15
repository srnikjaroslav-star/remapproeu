# Finálny Deploy Príkaz - Všetky Funkcie

## Deploy všetkých funkcií naraz

```bash
npx supabase functions deploy order-confirmation && npx supabase functions deploy order-ready && npx supabase functions deploy status-email && npx supabase functions deploy completion-email && npx supabase functions deploy generate-invoice && npx supabase functions deploy stripe-webhook && npx supabase functions deploy create-checkout
```

## Alebo jednotlivo (ak príkaz vyššie zlyhá):

```bash
npx supabase functions deploy order-confirmation
npx supabase functions deploy order-ready
npx supabase functions deploy status-email
npx supabase functions deploy completion-email
npx supabase functions deploy generate-invoice
npx supabase functions deploy stripe-webhook
npx supabase functions deploy create-checkout
```

## Zmeny v názvosloví:

✅ **Premenované priečinky:**
- `send-order-confirmation` → `order-confirmation`
- `send-order-ready` → `order-ready`
- `send-status-email` → `status-email`
- `send-completion-email` → `completion-email`

✅ **Aktualizované odkazy v kóde:**
- `stripe-webhook/index.ts` - používa `order-confirmation`
- `ManagementPortal.tsx` - používa `status-email`, `order-ready`
- `config.toml` - pridané konfigurácie pre všetky funkcie

✅ **Všetky funkcie majú nové farby:**
- Boxy: `#1a2e31` (petrolejová)
- Text: `#00f2ff` (cyan)
- Tlačidlá: `#00f2ff` pozadie, `#000000` text

## Overenie po deployi:

1. Skontroluj logy v Supabase Dashboard > Edge Functions
2. Otestuj vytvorenie objednávky cez Stripe
3. Skontroluj, či prichádzajú e-maily s novými farbami
