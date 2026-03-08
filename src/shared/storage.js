let airtrafficSettings = { mode: "route_matched", defaultContainer: "", useSync: false };

function getStorage() {
  return airtrafficSettings.useSync ? browser.storage.sync : browser.storage.local;
}

async function loadSettingsFromStorage() {
  const data = await browser.storage.local.get("settings");
  airtrafficSettings = data.settings || airtrafficSettings;
  return airtrafficSettings;
}

async function saveSettingsToStorage(updates) {
  Object.assign(airtrafficSettings, updates);
  await browser.storage.local.set({ settings: airtrafficSettings });
}

async function loadRulesFromStorage() {
  const storage = getStorage();
  const data = await storage.get("rules");
  return data.rules || [];
}

async function saveRulesToStorage(rules) {
  const storage = getStorage();
  await storage.set({ rules });
}

async function migrateRulesStorage(fromSync, toSync) {
  const oldStorage = fromSync ? browser.storage.sync : browser.storage.local;
  const newStorage = toSync ? browser.storage.sync : browser.storage.local;
  const data = await oldStorage.get("rules");
  await newStorage.set({ rules: data.rules || [] });
}
