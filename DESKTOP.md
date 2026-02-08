# CaseBrain Desktop

The same CaseBrain app can run in a **desktop window** via an Electron wrapper. No extra API keys; it loads your existing app (dev or production).

## Quick start

**Option A – Dev (app + desktop in one go)**  
```bash
npm run desktop
```
Starts the Next.js dev server and opens the Electron window when the app is ready.

**Option B – Dev (two terminals)**  
1. Terminal 1: `npm run dev`  
2. Terminal 2: `npm run electron`  

**Option C – Production URL**  
If your app is already deployed (e.g. `https://app.casebrain.com`), run:
```bash
set CASEBRAIN_APP_URL=https://app.casebrain.com
npm run desktop:standalone
```
(On Mac/Linux use `export CASEBRAIN_APP_URL=...`.)

## What you need

- **Electron** and **wait-on** are in `devDependencies` (run `npm install` if you haven’t).
- The desktop window loads `http://localhost:3000` by default, or the URL in `CASEBRAIN_APP_URL`.
- Your `.env.local` (Supabase, etc.) is used by the Next.js app when you run `npm run dev` or `npm run build` + `npm run start`; the Electron process just opens a browser window to that app.

## Keys you’ll need (when you add them)

- **Supabase** – Required for auth and data: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.
- **OpenAI** – For extraction/strategy: `OPENAI_API_KEY` (and optional model env vars). You can add this later; the app runs without it, but AI features won’t work until then.

You can add these in `.env.local` whenever you’re ready; the desktop app will use the same env as the web app.
