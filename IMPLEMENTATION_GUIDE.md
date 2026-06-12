# Soundboard Frontend — Implementation & Learning Guide

This document is the single source of truth for implementing this project. It is written
to be picked up by a Claude Code instance (Opus/Fable) initialised inside this repo,
working together with the project owner.

---

## 1. Who you are working with (READ FIRST)

The project owner is an experienced **Java / Spring Boot developer** with **zero frontend
experience**. This project is as much a *learning exercise* as a deliverable. You MUST:

- **Teach as you build.** Before and after writing code, give brief educational
  explanations of implementation choices. Relate frontend concepts to their Java/Spring
  equivalents where it helps (e.g. "the `api/` layer is your service layer",
  "`package.json` is your `pom.xml`").
- **Hand over meaningful decisions.** At designated "Learn by Doing" points (marked
  `👤 LEARN-BY-DOING` in the phase checklist below), do NOT write the code yourself.
  Instead: set up everything around it, leave exactly one `TODO(human)` comment in the
  code, explain the context/trade-offs, and wait for the owner to implement those 2–10
  lines before continuing.
- **Don't over-engineer.** "Basic and industry-standard" beats clever. No extra
  libraries beyond what's listed in §3 without discussing it first.

## 2. Project goal — v1 scope

A regular `USER` of the soundboard backend can:

1. **Log in** on a login page (JWT auth against the backend).
2. Land on a protected **Sounds page**: their sounds in a **grid of clickable tiles**.
3. **Click a tile to play** the audio (click again to pause; clicking another tile
   switches sounds).
4. **Search** their sounds via a search bar.
5. **Filter** by category and by tag.
6. **Sort** by the backend's allowed fields, ascending/descending.
7. **Paginate** through results (prev/next).
8. **Log out.**

**Explicitly out of scope for v1**: registration UI, upload UI, edit/delete sounds,
password-change page, admin screens. Test data is seeded with `curl` (§8).

## 3. Stack & current state

| Decision | Choice | Why |
|---|---|---|
| Framework | React 19 + Vite 8 | Industry default for SPAs calling a REST API |
| Language | TypeScript | Owner is a Java dev — typed DTOs, compile-time errors |
| Styling | **Plain CSS** (one file per component) | Learn flexbox/grid fundamentals before abstractions |
| Routing | `react-router-dom` v7 | Only runtime dependency beyond React |
| HTTP | Native `fetch` | No axios — fewer abstractions while learning |
| State | React context + component state | No Redux/TanStack Query for v1 |

**Already done:**
- Vite scaffold (`react-ts` template) committed; `npm install` run
- `react-router-dom` installed
- `vite.config.ts` sets `server: { port: 3000 }` — **required**, the backend's CORS
  allow-list only trusts `http://localhost:3000`
- Default Vite demo content (`App.tsx`, `App.css`, logos) is still present and needs
  stripping in Phase 1

**Not yet done:** everything in §6.

## 4. Backend API reference

Backend repo: `~/Desktop/soundboard` (Spring Boot 4, Java 21). Run it with
`./mvnw spring-boot:run` from that directory (default profile = H2 in-memory DB, data
lost on restart). Serves on `http://localhost:8080`.

**Base URL:** `http://localhost:8080/api/soundboard` — put it in `.env.development` as
`VITE_API_BASE_URL` (Vite exposes only `VITE_`-prefixed vars to client code via
`import.meta.env`).

### Auth

| Endpoint | Body | Response |
|---|---|---|
| `POST /user/register` (public) | `{username, password}` | — |
| `POST /user/login` (public) | `{username, password}` | `{username, token, message}` |

- Password rules (register): min 12 chars, at least one non-alphanumeric.
- The JWT expires after **2 hours**. Send it on every other request as
  `Authorization: Bearer <token>`.
- Login is **rate-limited per IP**: HTTP `429` with
  `{"error":"Too many login attempts. Please try again later."}` after ~10 attempts/min.
- If the account is flagged `mustChangePassword`, every request returns HTTP `403`
  `{"error":"Password change required before accessing this resource"}` — v1 just
  surfaces this message on login.

### Sounds (all require the Bearer token; all data is scoped to the logged-in user)

| Endpoint | Notes |
|---|---|
| `GET /sounds` | Query params: `page` (default 0), `size` (default 10), `sortBy` (`createdAt`\|`recentUpdate`\|`name`\|`category` — anything else → 400), `ascending` (default true), `category` (optional, case-insensitive, invalid → 400), `tag` (optional, case-insensitive). Returns `PagedResponse<GetSoundResponse>`. |
| `GET /sounds/search?keyword=...` | `keyword` max 100 chars; also accepts `page`/`size`. Returns a **plain array** `GetSoundResponse[]` — NOT the paged wrapper. Ignores category/tag/sort. |
| `GET /sounds/{id}` | Single `GetSoundResponse`. |
| `GET /sounds/{id}/download` | Streams the audio bytes (`Content-Type: audio/mpeg` etc.). **Requires the Authorization header** — see §7 playback design. |
| `POST /sounds` (multipart) | Parts: `soundRequest` (JSON: `{name, description}` only) + `file`. Used for seeding only in v1. |
| `PATCH /sounds/{id}` | JSON body, any of `{name, description, category, tags}`. Used for seeding categories/tags in v1. |

### Shapes (mirror these in `src/api/types.ts`)

```ts
type SoundCategory = 'BATTLE' | 'TRAVEL' | 'TAVERN' | 'CITY' | 'TENSE' | 'EPIC';

interface GetSoundResponse {
  id: string;            // UUID
  name: string;
  description: string;
  ownedBy: string;
  category: SoundCategory | null;
  tags: string[];
  createdAt: string;     // ISO-8601 instant
  recentUpdate: string | null;
}

interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

interface LoginResponse { username: string; token: string; message: string; }
```

### Error formats (handle both)

- Most errors: RFC 7807 `ProblemDetail` JSON (`{type, title, status, detail, ...}`)
- Some (rate limit, password gate, enum validation): `{"error": "..."}`
- Bean-validation failures: map of field → message
- `401` = missing/expired/invalid token → clear stored token, redirect to login

## 5. Target architecture

```
src/
  api/
    types.ts        # TS mirrors of backend DTOs (§4 shapes)
    client.ts       # fetch wrapper: base URL + Authorization header + error mapping
    auth.ts         # login()
    sounds.ts       # listSounds(params), searchSounds(keyword), getAudioBlob(id)
  auth/
    AuthContext.tsx # token state (localStorage), login/logout actions, useAuth() hook
  components/
    SoundTile.tsx   # name/category/tags; click → play; playing indicator
    SoundGrid.tsx   # CSS Grid of tiles
    Toolbar.tsx     # search input, category select, tag input, sort select, asc/desc
    Pagination.tsx  # prev/next + "page X of Y" from PagedResponse fields
  pages/
    LoginPage.tsx
    SoundsPage.tsx  # owns all query state; calls api/sounds; renders Toolbar+Grid+Pagination
  App.tsx           # routes: /login public; /sounds behind ProtectedRoute; / → /sounds
  *.css             # one stylesheet per component/page
```

Principles: components never call `fetch` directly (always through `api/`);
filtering/sorting/pagination are **server-side** (query params), never re-implemented
client-side; `SoundsPage` is the single owner of query state, children get props.

## 6. Implementation phases

Work through these in order. Each phase ends with something runnable — demo it to the
owner in the browser before moving on. Commit after each phase.

- [ ] **Phase 1 — Clean slate**: strip Vite demo content; minimal `App.tsx`; global
      `index.css` reset; verify `npm run dev` on :3000 shows an empty shell.
- [ ] **Phase 2 — API foundation**: `api/types.ts`, `api/client.ts` (attach token,
      JSON parsing, error mapping), `.env.development`.
- [ ] **Phase 3 — Auth**: `AuthContext` + `useAuth()`; `LoginPage` with controlled
      form; router with `ProtectedRoute`; logout button.
      `👤 LEARN-BY-DOING`: the login-error mapping — how 401 / 429 / 403-password-gate
      responses become user-facing messages on the form.
- [ ] **Phase 4 — Sounds grid (read-only)**: `api/sounds.ts`, `SoundsPage` fetching
      page 0 on mount (`useEffect`), `SoundGrid` + `SoundTile` (no playback yet);
      loading/empty/error states.
- [ ] **Phase 5 — Playback**: blob-fetch design from §7; one shared `<audio>` element.
      `👤 LEARN-BY-DOING`: the tile-click decision logic (play vs pause vs switch when
      a different tile is already playing).
- [ ] **Phase 6 — Toolbar**: search (search mode vs browse mode — see §7), category
      select, tag input, sort select + asc/desc toggle.
- [ ] **Phase 7 — Pagination**: prev/next from `first`/`last`/`totalPages`; reset to
      page 0 whenever filters/sort change.
- [ ] **Phase 8 — Styling pass**: responsive tile grid, polish forms/toolbar, visible
      focus states.
      `👤 LEARN-BY-DOING`: the CSS Grid rules for the responsive tile layout
      (`grid-template-columns`, `auto-fill` vs `auto-fit`, `minmax`).
- [ ] **Phase 9 — README**: how to run backend + frontend together, seeding steps.

## 7. Key design decisions (already agreed — don't relitigate)

**Audio playback via Blob URL.** `<audio src="http://...">` cannot send an
`Authorization` header, and the download endpoint requires one. So: `fetch` the bytes
with the token → `response.blob()` → `URL.createObjectURL(blob)` → assign to a single
shared `<audio>` element → `URL.revokeObjectURL` when playback ends or switches.
One sound plays at a time. (Cache blobs per sound id in memory if trivial; don't build
a caching layer.)

**Token in `localStorage`.** Acceptable for v1; explain the XSS trade-off vs http-only
cookies to the owner as a learning point, don't build cookie auth.

**Search mode vs browse mode.** The search endpoint returns a plain array and ignores
filters/sort. UI rule: while the search box has a keyword, call `searchSounds` and
disable the filter/sort/pagination controls; when cleared, return to browse mode
(`listSounds` with current filters). Debounce the search input (~300 ms) with a plain
`setTimeout`/`clearTimeout` in an effect — no library.

**Roles.** v1 targets a regular `USER` only. Admin endpoints exist but are ignored.

## 8. Running & seeding

```bash
# Terminal 1 — backend (H2 in-memory; data resets on restart)
cd ~/Desktop/soundboard && ./mvnw spring-boot:run

# Terminal 2 — frontend
npm run dev          # http://localhost:3000

# Seed a user + sounds (backend must be running). MP3 samples live in
# ~/Desktop/soundboard/sound-effect-files
API=http://localhost:8080/api/soundboard

curl -s -X POST $API/user/register -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"DemoPassword123!"}'

TOKEN=$(curl -s -X POST $API/user/login -H 'Content-Type: application/json' \
  -d '{"username":"demo","password":"DemoPassword123!"}' | jq -r .token)

# Upload (note: multipart JSON part must declare its content type).
# POST only takes name+description; set category/tags with a follow-up PATCH.
ID=$(curl -s -X POST $API/sounds -H "Authorization: Bearer $TOKEN" \
  -F 'soundRequest={"name":"Sword Clash","description":"Steel on steel"};type=application/json' \
  -F 'file=@/Users/arbnorbregu/Desktop/soundboard/sound-effect-files/<pick-one>.mp3;type=audio/mpeg' \
  | jq -r .id)

curl -s -X PATCH $API/sounds/$ID -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"category":"BATTLE","tags":["sword","metal"]}'
```

Seed at least ~5 sounds across 2–3 categories with overlapping tags so filters,
sorting and pagination (`size=2` is handy) are all demonstrable.

## 9. Verification walkthrough (end of project)

1. Bad login → friendly error; good login → lands on `/sounds`.
2. Tiles render with name/category/tags; click plays audio; click again pauses;
   clicking another tile switches.
3. Typing in search narrows results (and disables filters); clearing restores browse.
4. Category filter, tag filter, and combinations return correct subsets.
5. Each `sortBy` option + asc/desc visibly reorders.
6. With `size=2`: prev/next work; changing a filter resets to page 0.
7. Logout → back to login; visiting `/sounds` directly without a token redirects.
8. Stop the backend mid-session → friendly error, not a blank page. Expired/garbage
   token in localStorage → redirected to login, not stuck.

## 10. Gotchas

- **Port 3000 is load-bearing** — any other port breaks CORS against the backend.
- JWT expires after 2 h: a long dev session will suddenly start returning 401. That's
  the token, not a bug — the client.ts 401 handling should make this graceful.
- H2 is in-memory: restarting the backend wipes users and sounds; re-seed (§8).
  Audio files on disk under `./SoundAudio` survive, but their DB rows don't.
- Multipart uploads fail with 400 unless the `soundRequest` part is sent with
  `Content-Type: application/json` (see the `;type=` suffix in §8) and the file part
  declares an allowed audio MIME type (`audio/mpeg`, `audio/mp3`, `audio/wav`).
- React 19 + `react-router-dom` v7: prefer current idioms (`createBrowserRouter` or
  `<Routes>`; v7 renamed nothing relevant to v1, but don't copy v5-era tutorials with
  `<Switch>`).
- Strict Mode (on by default in the scaffold) double-invokes effects in dev — fetch
  effects must be written to tolerate running twice.
