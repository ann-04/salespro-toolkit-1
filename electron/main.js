import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { fork } from "child_process";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let mainWindow;
let serverProcess;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  const isDev = process.env.ELECTRON_START_URL;
  if (isDev) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, "../dist/index.html")}`);
  }
  mainWindow.on("closed", () => (mainWindow = null));
}
import pkg from 'electron-updater';
const { autoUpdater } = pkg;

function startServer() {
  const serverPath = path.join(__dirname, "../server/index.js");
  console.log(`Starting backend server from: ${serverPath}`);
  serverProcess = fork(serverPath, [], {
    env: { ...process.env, PORT: 3000 },
    stdio: "inherit",
  });

  serverProcess.on("error", (err) => {
    console.error("Server process failed:", err);
  });
}

// IPC Handlers for File Selection
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Documents', extensions: ['pdf', 'xlsx', 'xls', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'csv'] },
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  });
  return result;
});

ipcMain.handle('dialog:openFolder', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    ...options
  });
  return result;
});

app.on("ready", () => {
  startServer();
  createWindow();
  autoUpdater.checkForUpdatesAndNotify();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});
app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
