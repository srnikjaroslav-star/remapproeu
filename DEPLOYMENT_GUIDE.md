# Návod na nasadenie na Vercel

## 1. Prihlásenie do Vercel

V termináli spustite:
```bash
vercel login
```

Postupujte podľa inštrukcií (prihlásenie cez Google alebo GitHub).

## 2. Nasadenie projektu

Spustite:
```bash
vercel
```

Odpovedzte na otázky:
- **Set up and deploy?** → `yes`
- **Which scope?** → Vyberte svoj osobný scope
- **Link to existing project?** → `no`
- **What's your project's name?** → `remappro-portal` (alebo váš názov)
- **In which directory?** → Stlačte Enter (./)

## 3. Nastavenie Environment Variables

Po úspešnom nasadení pridajte environment variables:

### NEXT_PUBLIC_SUPABASE_URL
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
```
Keď sa opýta na hodnotu, vložte:
```
https://huswisewblkfcozdgvrq.supabase.co
```

### NEXT_PUBLIC_SUPABASE_ANON_KEY
```bash
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```
Keď sa opýta na hodnotu, vložte kľúč zo súboru `.env.local` (začína na `sb_publishable...` alebo podobne).

**Dôležité:** Pre každú environment variable vyberte:
- **Production** → `Y`
- **Preview** → `Y`  
- **Development** → `Y`

## 4. Opätovné nasadenie

Po pridaní environment variables spustite:
```bash
vercel --prod
```

Toto nasadí aplikáciu na produkciu s novými environment variables.

## 5. Overenie

Po nasadení by ste mali vidieť URL vašej aplikácie v termináli. Otestujte:
- Admin Dashboard: `https://your-project.vercel.app/admin`
- Client Portal: `https://your-project.vercel.app/portal/jan-cery`

## Tipy

- Environment variables môžete spravovať aj cez Vercel dashboard na https://vercel.com
- Pre každé nasadenie sa automaticky vytvorí preview URL
- Production URL sa vytvorí po prvom `vercel --prod`
