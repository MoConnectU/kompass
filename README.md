# Kompass

Daily Planning mit Quests, Fokus-Timer, Logbuch, Fachbereichen und Wochen-Review.

- React 19 + Vite, UI mit [HeroUI v3](https://heroui.com) (Tailwind CSS v4)
- `api/sync.js`: Vercel Function, speichert den Zustand in Upstash Redis (Sync Handy/PC)
- Deploy: Push auf `main` → Vercel baut automatisch (`npm run build`, Ausgabe `dist`)

Lokal: `npm install` und `npm run dev`
