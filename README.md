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

The `users/{userId}` rule above already covers the `avatarBase64` field (see "Profile Photo
Uploads" below) — it's just another field on the same document, so no rule changes are needed if
you're already using this block.

---

## Profile Photo Uploads

Settings → Profile lets you upload a photo, which is compressed client-side to roughly 150KB and
stored as a base64 string directly on your Firestore user document
(`users/{uid}.avatarBase64`) — there's no Firebase Storage involved.

This is deliberate, not a shortcut: **Cloud Storage for Firebase has required the paid Blaze plan
to provision or even keep using a bucket since Feb 3, 2026**, even for usage that would otherwise
be free. A project on the Spark (free, no card on file) plan can't use Storage at all as of that
date. Firestore has no such requirement and stays fully usable on Spark, and a compressed ~150KB
image (~200KB once base64-encoded) fits comfortably inside Firestore's 1 MiB per-document limit
alongside the rest of the settings fields.

How it works:
- `lib/imageCompress.ts` draws the upload onto a `<canvas>`, center-crops it to a square, and
  sweeps quality (then dimension, if needed) until the result is under the 150KB target —
  entirely in the browser, no network calls.
- `SettingsPage.tsx` saves the resulting data URL straight to the user's Firestore doc.
- `components/Avatar.tsx` subscribes live (`useUserProfile.ts`) to that doc, so the new photo
  shows up immediately in the sidebar and topbar without a page refresh, and falls back to the
  original gradient-with-initials look if no photo has been uploaded (or it fails to load).

If you outgrow the 150KB/Firestore approach later (e.g. you want full-resolution photos, not just
small compressed avatars), that's the point at which Cloud Storage + Blaze becomes worth it — but
nothing here requires that today.

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
│   ├── Avatar.tsx                 # Shared avatar (uploaded photo, or initials fallback)
│   └── layout/
│       └── DashboardLayout.tsx   # Sidebar + topbar shell
├── context/
│   └── AuthContext.tsx           # Firebase auth context + hooks
├── hooks/
│   ├── useGenshinProfile.ts      # Reads saved UID/server from Firestore
│   ├── useGameSchedule.ts        # Live-reads the Worker-fed schedule doc
│   ├── useUserProfile.ts         # Live-reads the signed-in user's profile doc (for Avatar)
│   └── useCountdown.ts           # Ticking countdown string
├── lib/
│   ├── firebase.ts                # Firebase app init
│   ├── enka.ts                    # Enka.Network API client + types
│   ├── genshinCharacters.ts       # avatarId -> name/element/icon lookup
│   ├── genshinStats.ts            # FIGHT_PROP_* label/formatting helpers
│   ├── genshinResets.ts           # Deterministic Abyss/Theater reset math
│   └── imageCompress.ts           # Client-side avatar compression (canvas -> base64 JPEG)
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

public/
└── characters/
    └── zibai.png                 # Bundled avatar for the one hardcoded character fallback
                                   # (Zibai / avatarId 10000126 — see genshinCharacters.ts)
```

---

## Notes on data sources

- **Character showcase** (Account page): live from `enka.network/api/uid/{uid}` — public, no
  key needed. Requires your in-game Character Showcase to be set up and public.
- **Character name/icon lookup**: resolved live from the dynamic character roster the Cloudflare
  Worker writes to Firestore (`characterRoster/current`), built fresh from Enka.Network's own
  datamined character data (`characters.json` + `loc.json`) on every run — see
  `../cloudflare-worker/README.md` for the full details. `lib/genshinCharacters.ts` reads that
  roster first; there's no hand-typed table for the general case. New characters appear
  automatically as soon as Enka's data picks them up — usually within a day of release. If a
  character hasn't synced yet, it shows as "Character #&lt;id&gt;" until it does, rather than
  guessing a name.
  **One documented exception:** avatarId `10000126` (Zibai) is hardcoded as a single fallback
  entry in `genshinCharacters.ts`, used only if the dynamic roster has nothing for that ID. She
  shipped Feb 3, 2026 (v6.3) but is confirmed entirely absent from `characters.json` upstream (not
  just unresolved — the key itself is missing), so unlike a normal new-character gap this one has
  no self-healing path. Her icon is a bundled static asset (`public/characters/zibai.png`) rather
  than an Enka CDN key, for the same reason. If you ever need to add a second character here, fix
  the Worker's roster build instead — see the comment above `ZIBAI_FALLBACK_META` for why.
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
