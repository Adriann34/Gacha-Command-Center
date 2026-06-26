# Gacha Command Center

A personal Genshin Impact dashboard: live version/banner/event tracking, your character
showcase pulled from Enka.Network, and a goal tracker for everything you want to keep on top of
in-game. Built with **React + Vite + TypeScript**, **Tailwind CSS v4**, and **Firebase**
(Auth + Firestore).

---

## Tech Stack

- **React 18** + **Vite 6** + **TypeScript 5** (strict mode)
- **Tailwind CSS v4** (new Vite plugin setup — no `tailwind.config.js` needed)
- **Firebase v11** — Authentication (Email/Password + Google) + Firestore (stays on the free
  Spark plan — nothing here requires Blaze)
- **React Router v7**
- **Lucide React** icons
- **Enka.Network API** — public, no key required, for your character showcase
- A small **Cloudflare Worker** (separate project, in `../cloudflare-worker`) that keeps the
  current version/banners/events live without you editing anything by hand

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project (or reuse
   an existing one).
2. Enable **Authentication** → Sign-in methods → **Email/Password** and **Google**.
3. Create a **Firestore Database**.
4. Go to **Project Settings → General → Your Apps → Web App** and copy your config.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in your Firebase values in `.env`.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Connect your Genshin UID

Sign in, go to **Settings → Genshin Account**, and enter your in-game UID. Make sure your
**Character Showcase** is set up in-game (Profile → Character Showcase) so your characters are
visible to Enka.Network — this is the same showcase other players see when they view your profile.

### 6. (Optional) Deploy the live schedule Worker

The Dashboard's Abyss/Theater countdowns work immediately with no extra setup, since those follow
a fixed in-game schedule. Current/upcoming **banners and events** need the small Cloudflare
Worker in `../cloudflare-worker` to be deployed once — see that folder's README for the
five-minute setup. Until it's deployed, the dashboard shows a friendly notice instead of breaking.

---

## TypeScript

```bash
npm run type-check   # type-check without building
npm run build         # type-checks first, then bundles
```

---

## Firestore Security Rules

Paste into Firebase Console → Firestore → Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /goals/{goalId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
    match /gameSchedule/{doc} {
      allow read: if true;   // public game data, fine for anyone to read
      allow write: if false; // only the Cloudflare Worker (Admin REST API) writes here
    }
  }
}
```

---

## Pages

| Route | File | Description |
|-------|------|--------------|
| `/signin` | `SignInPage.tsx` | Sign in with email/password or Google |
| `/signup` | `SignUpPage.tsx` | Create a new account |
| `/dashboard` | `DashboardPage.tsx` | Version, banners, events, Abyss/Theater countdowns |
| `/tracker` | `TrackerPage.tsx` | Your personal goal/to-do tracker (events, farming, prep) |
| `/account` | `AccountPage.tsx` | Character showcase pulled live from Enka.Network |
| `/settings` | `SettingsPage.tsx` | Profile, Genshin UID, notifications, appearance |

---

## Project Structure

```
src/
├── components/
│   └── layout/
│       └── DashboardLayout.tsx   # Sidebar + topbar shell
├── context/
│   └── AuthContext.tsx           # Firebase auth context + hooks
├── hooks/
│   ├── useGenshinProfile.ts      # Reads saved UID/server from Firestore
│   ├── useGameSchedule.ts        # Live-reads the Worker-fed schedule doc
│   └── useCountdown.ts           # Ticking countdown string
├── lib/
│   ├── firebase.ts                # Firebase app init
│   ├── enka.ts                    # Enka.Network API client + types
│   ├── genshinCharacters.ts       # avatarId -> name/element/icon lookup
│   ├── genshinStats.ts            # FIGHT_PROP_* label/formatting helpers
│   └── genshinResets.ts           # Deterministic Abyss/Theater reset math
├── pages/
│   ├── DashboardPage.tsx
│   ├── TrackerPage.tsx
│   ├── AccountPage.tsx
│   ├── SettingsPage.tsx
│   ├── SignInPage.tsx
│   └── SignUpPage.tsx
├── App.tsx                       # Router + protected routes
├── index.css                     # Tailwind v4 + global styles
└── main.tsx                      # React root entry point
```

---

## Notes on data sources

- **Character showcase** (Account page): live from `enka.network/api/uid/{uid}` — public, no
  key needed. Requires your in-game Character Showcase to be set up and public.
- **Character name/icon lookup**: maintained by hand in `lib/genshinCharacters.ts` since Enka's
  API returns numeric `avatarId`s only. Covers the roster through patch 6.6 (Luna VII). If a
  brand-new character doesn't show a name, add their `avatarId` there (visible in the raw Enka
  response) — everything else falls back gracefully to "Character #&lt;id&gt;" in the meantime.
- **Abyss / Theater resets**: computed deterministically (16th / 1st of month, 4 AM fixed server
  UTC offset) — no API dependency, always accurate.
- **Version / banners / events**: written to Firestore by the separate Cloudflare Worker project.
  See `../cloudflare-worker/README.md`.

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Deploy to Vercel, Netlify, or Firebase Hosting.
