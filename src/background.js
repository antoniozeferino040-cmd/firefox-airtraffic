const IGNORED_PROTOCOLS = ["about:", "moz-extension:", "chrome:", "resource:", "data:", "blob:"];
const TRANSIT_TIMEOUT_MS = 5000;

let cachedRules = [];
let tabsInTransit = new Set();

async function loadRules() {
  const data = await browser.storage.local.get("rules");
  cachedRules = data.rules || [];
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

async function handleTabUpdate(tabId, changeInfo, tab) {
  if (!changeInfo.url) return;
  if (tabsInTransit.has(tabId)) return;
  if (isIgnoredUrl(changeInfo.url)) return;

  const rule = findMatchingRule(changeInfo.url, cachedRules);
  if (!rule) return;
  if (tab.cookieStoreId === rule.cookieStoreId) return;

  const exists = await containerExists(rule.cookieStoreId);
  if (!exists) {
    console.warn(`[Air Traffic] Container ${rule.cookieStoreId} not found, skipping redirect`);
    return;
  }

  const newTab = await browser.tabs.create({
    url: changeInfo.url,
    cookieStoreId: rule.cookieStoreId,
    active: tab.active,
    index: tab.index + 1,
    windowId: tab.windowId,
  });

  tabsInTransit.add(newTab.id);
  setTimeout(() => tabsInTransit.delete(newTab.id), TRANSIT_TIMEOUT_MS);

  browser.tabs.remove(tabId);
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.rules) {
    cachedRules = changes.rules.newValue || [];
  }
});

browser.tabs.onUpdated.addListener(handleTabUpdate);

loadRules();
