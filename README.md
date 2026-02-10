# REMAPPRO Management Portal

Profesionálny systém pre správu služieb a zákazníkov s admin dashboardom a klientskym portálom.

## Funkcie

- **Admin Dashboard**: Kompletná správa klientov, služieb a záznamov prác
- **Klientsky Portál**: Čistý, profesionálny zobrazenie prác pre klientov
- **Správa služieb**: Pridávanie, úprava a mazanie služieb s kategóriami
- **Správa klientov**: Jednoduché pridávanie nových klientov
- **Automatické sumy**: Systém automaticky počíta celkové sumy za mesiac
- **Moderný dizajn**: Dark mode s glassmorphism a neon modrými akcentmi

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Notifications**: Sonner (Toast)

## Inštalácia

1. **Inštalácia závislostí**
   ```bash
   npm install
   ```

2. **Nastavenie Supabase**
   - Vytvorte nový Supabase projekt
   - Spustite SQL migráciu z `supabase-migration.sql` v SQL editore Supabase
   - Skopírujte Supabase URL a anon key

3. **Premenné prostredia**
   Vytvorte súbor `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Spustenie vývojového servera**
   ```bash
   npm run dev
   ```

5. **Prístup k aplikácii**
   - Admin Dashboard: `http://localhost:3000/admin`
   - Klientsky Portál: `http://localhost:3000/portal/[slug]`

## Databázová schéma

### Tabuľka clients
- `id` (UUID, Primary Key)
- `name` (TEXT) - Meno klienta
- `slug` (TEXT, UNIQUE) - URL identifikátor
- `created_at` (TIMESTAMPTZ)

### Tabuľka services
- `id` (UUID, Primary Key)
- `name` (TEXT) - Názov služby
- `price` (DECIMAL) - Cena v eurách
- `category` (TEXT) - Kategória (Performance, Emission Control, Engine Functions, Security)
- `created_at` (TIMESTAMPTZ)

### Tabuľka work_logs
- `id` (UUID, Primary Key)
- `client_id` (UUID, Foreign Key -> clients)
- `car_info` (TEXT) - Údaje o aute (napr. BMW X5 VIN...)
- `service_items` (JSONB) - Pole vybraných služieb s cenami
- `total_price` (DECIMAL) - Celková suma za úkon
- `month_key` (TEXT) - Automaticky generované (YYYY-MM)
- `created_at` (TIMESTAMPTZ)

## Hlavné funkcie

### Admin Dashboard

1. **Vstup údajov o aute**
   - Textové pole pre zadanie informácií o aute
   - Napríklad: "BMW X5 VIN..."

2. **Výber služieb**
   - Grid služieb rozdelených podľa kategórií
   - Kliknutím sa služba pridá k aktuálnemu autu
   - Okamžité zobrazenie celkovej sumy

3. **Uloženie úkonu**
   - Tlačidlo "Zapísať úkon" uloží auto a všetky vybrané služby
   - Automatické generovanie `month_key` pre aktuálny mesiac

4. **Správa klientov**
   - Tlačidlo "Pridať klienta" v sidebar
   - Automatické generovanie slug z mena

5. **Správa služieb**
   - Stránka `/admin/settings` pre správu služieb
   - Pridávanie, úprava a mazanie služieb

### Klientsky Portál

- **Bezpečnosť**: Klient vidí IBA svoje dáta
- **Zobrazenie**: Čistý, profesionálny zoznam prác za aktuálny mesiac
- **Filter**: Možnosť prepnúť na "Minulý mesiac"
- **Celková suma**: Zobrazená na spodku tabuľky
- **Žiadne editačné možnosti**: Len zobrazenie

## Dizajn

- **Pozadie**: #050505 (Dark Mode)
- **Akcenty**: #00d2ff (Neon Blue)
- **Efekty**: Glassmorphism karty
- **Responzivita**: Optimalizované pre mobilné zariadenia (použitie v garáži)

## Footer

Na každej stránke sa zobrazuje:

**REMAPPRO**  
Janka Kráľa 29, 990 01 Veľký Krtíš, Slovakia  
IČO: 41281471 | DIČ: 1041196607

## Štruktúra projektu

```
src/
├── app/
│   ├── admin/
│   │   ├── page.tsx          # Admin dashboard
│   │   └── settings/
│   │       └── page.tsx      # Správa služieb
│   ├── portal/
│   │   └── [slug]/
│   │       └── page.tsx      # Klientsky portál
│   └── layout.tsx
├── components/
│   ├── AdminDashboard.tsx    # Hlavný admin dashboard
│   ├── AdminWorkLogTable.tsx # Tabuľka záznamov (admin)
│   ├── ClientWorkLogTable.tsx # Tabuľka záznamov (klient)
│   ├── Sidebar.tsx           # Bočný panel
│   ├── Footer.tsx            # Footer komponenta
│   └── AddClientModal.tsx    # Modal pre pridanie klienta
└── lib/
    └── supabase/
        ├── client.ts         # Supabase klient
        └── queries.ts         # Databázové dotazy
```

## Licencia

Súkromná - REMAPPRO Management Portal
