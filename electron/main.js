const { app, BrowserWindow } = require("electron");
const path = require("path");

// Load the app from dev server or production URL
const APP_URL = process.env.CASEBRAIN_APP_URL || "http://localhost:3000";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "..", "public", "favicon.ico"),
    title: "CaseBrain",
  });

  win.loadURL(APP_URL);

  // Open DevTools in development if desired
  if (process.env.NODE_ENV === "development") {
    // win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
