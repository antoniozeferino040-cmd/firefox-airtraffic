const IGNORED_PROTOCOLS = ["about:", "moz-extension:", "chrome:", "resource:", "data:", "blob:"];
const TRANSIT_TIMEOUT_MS = 5000;
const BADGE_CLEAR_MS = 3000;

let cachedRules = [];
let cachedSettings = { mode: "route_matched", defaultContainer: "", useSync: false };
let tabsInTransit = new Set();
let redirectCount = 0;

function getStorage() {
  return cachedSettings.useSync ? browser.storage.sync : browser.storage.local;
}

async function loadRules() {
  const local = await browser.storage.local.get(["rules", "settings"]);
  cachedSettings = local.settings || cachedSettings;

  const storage = getStorage();
  const data = await storage.get("rules");
  cachedRules = data.rules || [];
}

async function loadSettings() {
  const data = await browser.storage.local.get("settings");
  cachedSettings = data.settings || cachedSettings;
}

function isIgnoredUrl(url) {
  return !url || IGNORED_PROTOCOLS.some((p) => url.startsWith(p));
}

async function containerExists(cookieStoreId) {
  try {
    await browser.contextualIdentities.get(cookieStoreId);
    return true;
  } catch {
    return false;
  }
}

function showBadge(text) {
  browser.browserAction.setBadgeText({ text });
  browser.browserAction.setBadgeBackgroundColor({ color: "#2ecc71" });
  setTimeout(() => browser.browserAction.setBadgeText({ text: "" }), BADGE_CLEAR_MS);
}

async function redirectTab(tabId, url, cookieStoreId, tab) {
  const exists = await containerExists(cookieStoreId);
  if (!exists) {
    console.warn(`[Air Traffic] Container ${cookieStoreId} not found, skipping redirect`);
    return;
  }

  const newTab = await browser.tabs.create({
    url,
    cookieStoreId,
    active: tab.active,
    index: tab.index + 1,
    windowId: tab.windowId,
  });

  tabsInTransit.add(newTab.id);
  setTimeout(() => tabsInTransit.delete(newTab.id), TRANSIT_TIMEOUT_MS);

  browser.tabs.remove(tabId);

  redirectCount++;
  showBadge(`${redirectCount}`);
}

async function handleTabUpdate(tabId, changeInfo, tab) {
  if (!changeInfo.url) return;
  if (tabsInTransit.has(tabId)) return;
  if (isIgnoredUrl(changeInfo.url)) return;

  if (cachedSettings.mode === "route_all") {
    // Route ALL mode: redirect everything to default container, EXCEPT matched rules
    if (!cachedSettings.defaultContainer) return;
    const rule = findMatchingRule(changeInfo.url, cachedRules);
    if (rule) return; // matched = excluded from redirect
    if (tab.cookieStoreId === cachedSettings.defaultContainer) return;
    await redirectTab(tabId, changeInfo.url, cachedSettings.defaultContainer, tab);
  } else {
    // Route MATCHED mode (default): only redirect matched URLs
    const rule = findMatchingRule(changeInfo.url, cachedRules);
    if (!rule) return;
    if (tab.cookieStoreId === rule.cookieStoreId) return;
    await redirectTab(tabId, changeInfo.url, rule.cookieStoreId, tab);
  }
}

// Context menu: "Open in Container" submenu
async function buildContextMenus() {
  await browser.menus.removeAll();

  let containers;
  try {
    containers = await browser.contextualIdentities.query({});
  } catch {
    return;
  }

  for (const c of containers) {
    browser.menus.create({
      id: `open-in-${c.cookieStoreId}`,
      title: `Open in ${c.name}`,
      contexts: ["link"],
    });
  }
}

browser.menus.onClicked.addListener(async (info, tab) => {
  const prefix = "open-in-";
  if (!info.menuItemId.startsWith(prefix)) return;

  const cookieStoreId = info.menuItemId.slice(prefix.length);
  const url = info.linkUrl;
  if (!url || isIgnoredUrl(url)) return;

  const exists = await containerExists(cookieStoreId);
  if (!exists) return;

  browser.tabs.create({
    url,
    cookieStoreId,
    active: true,
    index: (tab?.index ?? 0) + 1,
    windowId: tab?.windowId,
  });
});

// Rebuild context menus when containers change
browser.contextualIdentities.onCreated.addListener(buildContextMenus);
browser.contextualIdentities.onRemoved.addListener(buildContextMenus);
browser.contextualIdentities.onUpdated.addListener(buildContextMenus);

// Storage change listener
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) {
    cachedSettings = changes.settings.newValue || cachedSettings;
    // Reload rules if sync setting changed
    loadRules();
  }
  if (changes.rules) {
    cachedRules = changes.rules.newValue || [];
  }
});

browser.tabs.onUpdated.addListener(handleTabUpdate);

loadRules();
buildContextMenus();
