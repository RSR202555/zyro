import { contextBridge, ipcRenderer } from "electron";

// Cria uma ponte segura no objeto 'window' do front-end
contextBridge.exposeInMainWorld("zyroDesktop", {
  getEnv: () => ipcRenderer.invoke("get-env"),
  reloadApp: () => ipcRenderer.invoke("reload-app"),
  onToggleMute: (callback: () => void) => {
    ipcRenderer.on("global-shortcut-toggle-mute", () => callback());
  },
  onToggleDeafen: (callback: () => void) => {
    ipcRenderer.on("global-shortcut-toggle-deafen", () => callback());
  },
  onGameDetected: (callback: (gameName: string) => void) => {
    ipcRenderer.on("game-detected", (_: any, gameName: any) => callback(gameName));
  },
});
