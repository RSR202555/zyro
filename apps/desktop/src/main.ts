import { app, BrowserWindow, ipcMain, session, desktopCapturer, Menu, Tray, Notification, globalShortcut } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as http from "http";
import { exec, spawn, ChildProcess } from "child_process";

let localNextServerProcess: ChildProcess | null = null;

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
    {
      label: "Recarregar e Atualizar App",
      click: async () => {
        if (mainWindow) {
          await session.defaultSession.clearCache();
          mainWindow.webContents.reloadIgnoringCache();
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

async function createWindow() {
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
  session.defaultSession.setDisplayMediaRequestHandler((request: any, callback: any) => {
    desktopCapturer.getSources({ types: ["screen", "window"] }).then((sources: any) => {
      if (sources.length > 0) {
        callback({ video: sources[0] });
      } else {
        callback({});
      }
    });
  });

  let targetUrl = process.env.ELECTRON_START_URL;

  if (!targetUrl) {
    // 1. Verificar se o servidor de desenvolvimento na porta 3000 já está ativo
    const isDevActive = await new Promise<boolean>((resolve) => {
      const req = http.get("http://127.0.0.1:3000", () => resolve(true));
      req.on("error", () => resolve(false));
      req.setTimeout(500, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (isDevActive) {
      targetUrl = "http://127.0.0.1:3000";
    } else {
      // 2. Tentar rodar o servidor local de produção na porta 3005
      const webDir = path.join(__dirname, "../../web");
      if (fs.existsSync(webDir)) {
        try {
          const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
          localNextServerProcess = spawn(npxCmd, ["next", "start", "-p", "3005"], {
            cwd: webDir,
            env: { ...process.env, PORT: "3005" },
            shell: true,
          });

          for (let i = 0; i < 15; i++) {
            await new Promise((r) => setTimeout(r, 400));
            const isReady = await new Promise<boolean>((resolve) => {
              const req = http.get("http://127.0.0.1:3005", () => resolve(true));
              req.on("error", () => resolve(false));
              req.setTimeout(300, () => {
                req.destroy();
                resolve(false);
              });
            });
            if (isReady) {
              targetUrl = "http://127.0.0.1:3005";
              break;
            }
          }
        } catch (e) {
          console.error("Failed to start localNextServerProcess:", e);
        }
      }
    }
  }

  if (!targetUrl) {
    targetUrl = "https://zyro8837.vercel.app";
  }

  // Limpar cache de HTTP, Service Workers e CacheStorage do Electron no arranque
  try {
    await session.defaultSession.clearCache();
    await session.defaultSession.clearStorageData({
      storages: ["cookies", "filesystem", "indexdb", "localstorage", "shadercache", "websql", "serviceworkers", "cachestorage"],
    });
  } catch (err) {
    console.warn("Storage clear warning:", err);
  }

  mainWindow.loadURL(targetUrl, {
    extraHeaders: "pragma: no-cache\nCache-Control: no-cache, no-store, must-revalidate\n",
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Minimizar para a bandeja ao clicar no fechar
  mainWindow.on("close", (e: any) => {
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

  // Registrar atalhos globais de recarga de cache
  globalShortcut.register("CommandOrControl+R", async () => {
    if (mainWindow) {
      await session.defaultSession.clearCache();
      mainWindow.webContents.reloadIgnoringCache();
    }
  });

  globalShortcut.register("F5", async () => {
    if (mainWindow) {
      await session.defaultSession.clearCache();
      mainWindow.webContents.reloadIgnoringCache();
    }
  });

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
  if (localNextServerProcess) {
    try {
      localNextServerProcess.kill();
    } catch (e) {}
  }
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

ipcMain.handle("reload-app", async () => {
  if (mainWindow) {
    try {
      await session.defaultSession.clearCache();
      await session.defaultSession.clearStorageData({
        storages: ["cookies", "filesystem", "indexdb", "localstorage", "shadercache", "websql", "serviceworkers", "cachestorage"],
      });
    } catch (e) {
      console.warn("Reload app clear cache error:", e);
    }
    mainWindow.webContents.reloadIgnoringCache();
  }
  return true;
});
