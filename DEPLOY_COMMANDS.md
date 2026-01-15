# Príkazy na Deploy Edge Funkcií

## 1. Deploy stripe-webhook (kritické - nová logika e-mailov)

```bash
npx supabase functions deploy stripe-webhook
```

**Zmeny:**
- ✅ E-mail sa teraz odosiela IBA po platbe (send-order-confirmation)
- ✅ Faktúra sa negeneruje v stripe-webhook
- ✅ Faktúra sa generuje až keď sa nahráva finálny súbor (v ManagementPortal)

## 2. Overenie Secrets (pred deployom)

Uisti sa, že máš nastavené tieto secrets v Supabase Dashboard:

```bash
# Skontroluj secrets
npx supabase secrets list
```

Alebo cez Dashboard:
- Project Settings > Edge Functions > Secrets
- Musí byť nastavené:
  - `RESEND_API_KEY` = tvoj Resend API kľúč
  - `SUPABASE_SERVICE_ROLE_KEY` = tvoj Service Role Key
  - `STRIPE_WEBHOOK_SECRET` = tvoj Stripe webhook secret (ak používaš)

## 3. Testovanie po deployi

Po deployi skontroluj logy v Supabase Dashboard:
- Edge Functions > stripe-webhook > Logs
- Hľadaj tieto logy:
  - `DEBUG: Spúšťam odosielanie potvrdzovacieho e-mailu pre objednávku:`
  - `DEBUG: Order confirmation email result:`
  - `DEBUG: Order confirmation email HTTP error:` (ak je chyba)

## 4. Dôležité poznámky

- E-mail sa teraz odosiela **PRED** generovaním faktúry
- E-mail sa odosiela aj v prípade, že generovanie faktúry zlyhá
- Všetky premenné majú fallback hodnoty (customerName = "Zákazník", ak chýba)
- Detailné logovanie je pridané pre debugging

## 5. Riešenie problémov

Ak e-mail stále nepríde:
1. Skontroluj logy v Supabase Dashboard
2. Over, či je `RESEND_API_KEY` správne nastavený
3. Over, či je doména `remappro.eu` overená v Resend Dashboard
4. Skontroluj, či `customerEmail` nie je prázdny v logoch
