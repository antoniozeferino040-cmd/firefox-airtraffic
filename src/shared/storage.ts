import type { Rule, Settings } from "../types";

const DEFAULT_SETTINGS: Settings = { mode: "route_matched", defaultContainer: "", useSync: false };
let airtrafficSettings: Settings = { ...DEFAULT_SETTINGS };

function getStorage() {
  return airtrafficSettings.useSync ? browser.storage.sync : browser.storage.local;
}

export async function loadSettingsFromStorage(): Promise<Settings> {
  const data = await browser.storage.local.get("settings");
  airtrafficSettings = (data.settings as Settings) || { ...DEFAULT_SETTINGS };
  return airtrafficSettings;
}

export async function saveSettingsToStorage(updates: Partial<Settings>): Promise<void> {
  Object.assign(airtrafficSettings, updates);
  await browser.storage.local.set({ settings: airtrafficSettings });
}

export async function loadRulesFromStorage(): Promise<Rule[]> {
  const storage = getStorage();
  const data = await storage.get("rules");
  return (data.rules as Rule[]) || [];
}

export async function saveRulesToStorage(rules: Rule[]): Promise<void> {
  const storage = getStorage();
  await storage.set({ rules });
}

export async function migrateRulesStorage(fromSync: boolean, toSync: boolean): Promise<void> {
  const oldStorage = fromSync ? browser.storage.sync : browser.storage.local;
  const newStorage = toSync ? browser.storage.sync : browser.storage.local;
  const data = await oldStorage.get("rules");
  await newStorage.set({ rules: (data.rules as Rule[]) || [] });
}

export function getSettings(): Settings {
  return airtrafficSettings;
}
