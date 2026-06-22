# Mission Trips Frontend

Vue 3 + Vite + Vuetify SPA for the Mission Trip System.

## Stack

- Vue 3, Vuetify, Vue Router, Axios
- localStorage session (matches clienttracking-frontend pattern)

## Setup

```bash
npm install
npm run dev
```

App: `http://localhost:8082`

Backend must be running at `http://localhost:3200/missiontrips/`

## Public donor pages (no login)

- `/donate/trip/:tripId` — donate to a trip, optionally select participant
- `/donate/trip/:tripId/participant/:personId` — donate to a specific participant

## Build

```bash
npm run build
```

Deploy `dist/` with SPA `.htaccess` (included in `public/`).
