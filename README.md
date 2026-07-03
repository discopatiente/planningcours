# Planificateur de cours annuel

Application web pour construire un référentiel de cours réutilisable et le projeter sur une année scolaire réelle. Voir `brief_planificateur_cours.md` pour le cahier des charges complet et `CLAUDE.md` pour les conventions de développement.

## Stack

- React + Vite (frontend)
- Supabase (PostgreSQL + authentification Google)
- Vercel (hébergement)

## Démarrage

```bash
npm install
cp .env.example .env.local  # puis renseigner les clés Supabase
npm run dev
```

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run lint` — lint (oxlint)
- `npm run preview` — prévisualiser le build de production
