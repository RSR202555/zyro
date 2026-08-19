export function isElectron(): boolean {
  return typeof window !== "undefined" && typeof (window as any).zyroDesktop !== "undefined";
}

export async function getDesktopEnv() {
  if (isElectron()) {
    return await (window as any).zyroDesktop.getEnv();
  }
  return { isDesktop: false, platform: "web" };
}
