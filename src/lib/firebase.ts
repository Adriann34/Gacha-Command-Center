// src/lib/firebase.ts
// Replace these values with your own Firebase project config
// Go to: https://console.firebase.google.com → Your Project → Project Settings → General → Your Apps

import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string || "YOUR_AUTH_DOMAIN",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string || "YOUR_STORAGE_BUCKET",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string || "YOUR_APP_ID",
}

const app = initializeApp(firebaseConfig)

// App Check — this is the anti-abuse layer. Once enforcement is switched on in the Firebase
// console (Project Settings → App Check → enforce on Cloud Firestore + Authentication), Firebase
// rejects any request that doesn't carry a valid App Check token minted by *your* deployed site.
// That is what stops someone scripting reads/writes straight at your project (using the public web
// config that necessarily ships in the bundle) and burning your free-tier quota into an outage.
//
// Setup (see README "App Check"): register the site with reCAPTCHA v3, then put the SITE key in
// VITE_FIREBASE_APPCHECK_SITE_KEY. If the key is absent we skip initialization so the app still
// runs (e.g. before you've set it up) — App Check simply isn't active until it's configured.
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY as string | undefined
if (appCheckSiteKey) {
  // Local dev can't solve a real reCAPTCHA against your production domain, so enable Firebase's
  // debug-token flow in dev. On first `npm run dev` the console prints a debug token — register it
  // once under App Check → Manage debug tokens so the emulated app is allowed through. This is
  // dev-only and is stripped from production builds (import.meta.env.DEV is false there).
  if (import.meta.env.DEV) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
