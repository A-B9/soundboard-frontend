# Soundboard Frontend

A React + TypeScript single-page app for the Soundboard backend. A logged-in
user sees their sounds as a grid of clickable tiles, can play them, and can
search, filter, sort and paginate through them.

## Stack

| Concern | Choice |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript |
| Routing | react-router-dom v7 |
| HTTP | native `fetch` (no axios) |
| State | React context + component state (no Redux/React Query) |
| Styling | plain CSS, one stylesheet per component |

## Prerequisites

- Node.js 20+ and npm
- Docker (for the backend) — or any running instance of the Soundboard API

## Running the app

The frontend talks to the backend at `http://localhost:8080`. Start the backend
first, then the frontend.

### 1. Backend (Docker)

The backend lives at `~/Desktop/soundboard` and runs as two containers
(Spring Boot app + PostgreSQL 16) via Docker Compose:

```bash
cd ~/Desktop/soundboard
cp .env.example .env      # first time only — fill in the bootstrap credentials
docker compose up --build
```

This starts:
- `soundboard-postgres-container` — Postgres on `localhost:5432`
- `soundboard-container` — the API on `http://localhost:8080`

Data persists in named Docker volumes (`soundboard-db-data` for the database,
`soundboard-audio-data` for the audio files), so users and sounds survive
restarts. A bootstrap admin user is created from the `APP_BOOTSTRAP_*` values
in `.env` on first run.

To stop: `docker compose down` (add `-v` to also wipe the volumes/data).

### 2. Frontend (Vite dev server)

```bash
npm install        # first time only
npm run dev
```

Open **http://localhost:3000**.

> **Port 3000 is required.** The backend's CORS allow-list only trusts
> `http://localhost:3000`; any other port breaks API calls. The port is pinned
> in `vite.config.ts`.

### Environment

`.env.development` sets the API base URL that the client reads via
`import.meta.env.VITE_API_BASE_URL`:

```
VITE_API_BASE_URL=http://localhost:8080/api/soundboard
```

Only `VITE_`-prefixed variables are exposed to client code. To point at a
different backend, override this value.

## Usage notes

- **Login.** Use a user that exists in the backend. The JWT is stored in
  `localStorage` and expires after 2 hours — once it does, the next request
  returns 401 and the app redirects you to the login page to sign in again.
- **Playback.** One sound plays at a time. Click a tile to play, click it again
  to pause; clicking a different tile switches. Audio is fetched as an
  authenticated blob (the download endpoint requires the Bearer token), so the
  raw URL is never exposed to an `<audio src>`.
- **Search vs browse.** Typing in the search box switches to the backend's
  search endpoint, which returns a flat list and ignores filters/sort/paging —
  so those controls are disabled while a search keyword is present. Clear the
  box to return to browse mode.

## Project structure

```
src/
  api/         fetch wrapper, typed DTOs, auth + sounds calls
  auth/        AuthContext + useAuth() (token in localStorage)
  components/  SoundTile, SoundGrid, Toolbar, Pagination
  hooks/       useAudioPlayer (shared <audio>), useDebouncedValue
  pages/       LoginPage, SoundsPage (owns all query state)
  App.tsx      routes (/login public, /sounds protected)
```

Components never call `fetch` directly — all network access goes through
`src/api/`. Filtering, sorting and pagination are done server-side via query
params, never re-implemented on the client.

## Scripts

```bash
npm run dev      # start the dev server on :3000
npm run build    # type-check (tsc -b) and produce a production build
npm run lint     # run ESLint
npm run preview  # serve the production build locally
```
