# En Plattform – KS-system for bygg og anlegg

## Oppsett

### 1. Supabase database
1. Gå til Supabase-prosjektet ditt
2. Klikk på **SQL Editor**
3. Kopier innholdet fra `supabase-setup.sql`
4. Klikk **Run** for å sette opp alle tabeller

### 2. Opprett admin-bruker
1. I Supabase: gå til **Authentication → Users**
2. Klikk **Add user**
3. Fyll inn e-post og passord
4. Etter at brukeren er opprettet, gå til **Table Editor → profiles**
5. Finn brukeren og sett `role` til `admin`

### 3. Deploy til Vercel
1. Push koden til GitHub
2. Gå til vercel.com og importer repositoryet
3. Legg til environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klikk Deploy

## Moduler
- ✅ Dashboard med alle modulkort
- ✅ Innlogging med Supabase Auth
- ✅ Kollapsbar sidebar
- ✅ Rollestyring (admin, prosjektleder, ansatt, regnskapsfører)
- 🔄 Prosjekter (under utvikling)
- 🔄 Avvik (under utvikling)
- 🔄 Sjekklister (under utvikling)
- ... og alle øvrige moduler

## Teknologi
- React 18
- Supabase (database + auth + fillagring)
- Vercel (hosting)
- Tailwind CSS
- React Router
- TanStack Query
