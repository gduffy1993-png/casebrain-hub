# Desktop app – build installers and download links

The desktop app runs in an Electron window and loads your CaseBrain URL (dev or production). To offer **downloadable installers** (Windows `.exe`, Mac `.dmg`/`.app`), use the steps below.

## 1. Build installers

Install dependencies (includes `electron-builder`):

```bash
npm install
```

Build for the current platform:

```bash
npm run desktop:build
```

Or build for a specific OS (run on that OS or use a build host/CI):

```bash
npm run desktop:build:win   # Windows
npm run desktop:build:mac  # macOS
```

Output goes to the **`dist/`** folder (e.g. `dist/CaseBrain Setup 0.1.0.exe` on Windows, `dist/CaseBrain-0.1.0.dmg` on Mac).

## 2. Host the installers

Upload the files from `dist/` to a place users can download from, for example:

- Your own server (e.g. `https://app.casebrain.com/downloads/`)
- **GitHub Releases** – create a release, attach the installer files
- A CDN or file host

## 3. Add download links

Add links on your site or in the app, for example:

- **Download for Windows** → `https://your-domain.com/path/CaseBrain%20Setup%200.1.0.exe`
- **Download for Mac** → `https://your-domain.com/path/CaseBrain-0.1.0.dmg`

You can add a “Download desktop app” section on the Upgrade page, in Settings, or on a dedicated `/download` page. When the user runs the installer, they get the Electron window that loads your app URL (set `CASEBRAIN_APP_URL` in the packaged app if needed, or rely on default).

## Notes

- The packaged app does **not** bundle the Next.js app; it opens a window to your deployed URL (or localhost in dev). So your web app must be live at that URL.
- For auto-updates, you’d add something like `electron-updater` and a feed URL; that’s separate from this flow.
- Code signing (Mac/Windows) improves trust; see [electron-builder code signing](https://www.electron.build/code-signing) when you’re ready.
