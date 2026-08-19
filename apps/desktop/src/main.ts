import { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu, Tray, Notification, globalShortcut } from "electron";
import * as path from "path";
import { exec } from "child_process";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let activeGame: string | null = null;

const GAMES_MAP: Record<string, string> = {
  "League of Legends.exe": "League of Legends",
  "VALORANT-Win64-Shipping.exe": "VALORANT",
  "cs2.exe": "Counter-Strike 2",
  "GTA5.exe": "Grand Theft Auto V",
  "Minecraft.exe": "Minecraft",
  "javaw.exe": "Minecraft",
  "Discord.exe": "Discord (Teste)",
};

function scanForGames() {
  if (process.platform !== "win32") return;

  exec("tasklist /nh /fo csv", (err, stdout) => {
    if (err) return;

    const lines = stdout.split("\r\n");
    let detectedGame: string | null = null;

    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^"([^"]+)"/);
      if (match) {
        const processName = match[1];
        if (GAMES_MAP[processName]) {
          detectedGame = GAMES_MAP[processName];
          break;
        }
      }
    }

    if (detectedGame !== activeGame) {
      activeGame = detectedGame;
      if (mainWindow) {
        mainWindow.webContents.send("game-detected", activeGame);
      }
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, "../../../logozyro.png");
  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir Zyro",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip("Zyro Desktop");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Zyro",
    icon: path.join(__dirname, "../../../logozyro.png"),
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#09090b",
      symbolColor: "#a1a1aa",
      height: 32,
    },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: "#09090b",
  });

  // Esconder barra de menus padrão ("File, Edit, View...")
  mainWindow.setMenuBarVisibility(false);

  // Habilitar compartilhamento de tela nativo no Electron
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources) => {
      if (sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    });
  });

  let startUrl = process.env.ELECTRON_START_URL || "http://localhost:3000";

  if (app.isPackaged) {
    try {
      const fs = require("fs");
      const configPath = path.join(__dirname, "config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (config.startUrl) {
          startUrl = config.startUrl;
        }
      }
    } catch (e) {
      console.error("Failed to load config.json:", e);
    }
  }

  mainWindow.loadURL(startUrl);

  mainWindow.webContents.openDevTools();

  // Minimizar para a bandeja ao clicar no fechar
  mainWindow.on("close", (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
      
      if (Notification.isSupported()) {
        new Notification({
          title: "Zyro",
          body: "O Zyro continua em execução na bandeja do sistema.",
          silent: true
        }).show();
      }
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  createWindow();
  createTray();

  // Registrar atalhos globais
  globalShortcut.register("CommandOrControl+Alt+M", () => {
    if (mainWindow) {
      mainWindow.webContents.send("global-shortcut-toggle-mute");
    }
  });

  globalShortcut.register("CommandOrControl+Alt+D", () => {
    if (mainWindow) {
      mainWindow.webContents.send("global-shortcut-toggle-deafen");
    }
  });

  // Iniciar varredura periódica de jogos
  scanForGames();
  setInterval(scanForGames, 15000);
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC seguro para consultas nativas do sistema
ipcMain.handle("get-env", () => {
  return {
    isDesktop: true,
    platform: process.platform,
  };
});
